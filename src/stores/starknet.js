import { defineStore } from 'pinia'
import { useTuxitStore } from './tuxit'
import { connect, disconnect } from '@argent/get-starknet';
import { Contract, validateAndParseAddress, uint256 } from "starknet";
import { networkNames, supportedChainIds, defaultChainId, etherAddress} from '@/helpers/blockchainConstants';
import erc20Abi from './abis/erc20.json' assert {type: 'json'};

let _starknet = null;
let _tuxitStore = null;
let _etherContract = null;

let _initialState = {
  initialized: false,
  connecting: false,
  connected: false,
  address: '',
  chainId: '',
  networkName: '',
  defaultNetworkName: '',
  balance: null,
}

export const useStarkNetStore = defineStore({
  id: 'starknet',

  state: () => ({ ..._initialState }),

  getters: {
    networkOk: (state) => state.connected && supportedChainIds.includes(state.chainId),
    ethBalance: (state) => parseFloat(formatEther(state.balance)),
    starknet: (state) => _starknet
  },

  actions: {
    shortAddress(length) { return `${this.address.substring(0,14)}...${this.address.substring(this.address.length-14)}`; },

    async init() {
      console.log("starknet: init()");
      _tuxitStore = useTuxitStore();
      _starknet = await connect({ showList: false });
      await _starknet?.enable();
      if (_starknet?.isConnected) {
          this.login();
      } else  {
        this.initialized = true;
      }
    },

    async connect() {
      console.log("starknet: connect()");
      this.connecting = true;
      _starknet = await connect({ modalOptions: {theme: 'dark'} });
      await _starknet?.enable();
      this.login(); 
    },

    handleAccountsChanged(accounts) {
      console.log(`starknet: handleAccountsChanged()`);
      if (validateAndParseAddress(_starknet.selectedAddress) != this.address || _starknet.provider.chainId != this.chainId) {
        location.reload();
      }
    },

    async login() {
      if (_starknet?.isConnected) {
        
        this.logout();
        console.log("starknet: login()");

        this.$patch({
          connecting: true,
          connected: true,
          initialized: true,
          address: validateAndParseAddress(_starknet.selectedAddress),
          chainId: _starknet.provider.chainId,
          networkName: networkNames[_starknet.provider.chainId],
          defaultNetworkName: networkNames[defaultChainId]
        });

        _starknet.on("accountsChanged", (accounts) => this.handleAccountsChanged(accounts));

        if (this.networkOk) {
          _tuxitStore.init();
          _etherContract = new Contract(erc20Abi, etherAddress, _starknet.account);
          await this.updateBalance();
        }
  
        this.connecting = false;
      } else {
        this.logout();
      }
    },

    async updateBalance() {
      console.log("starknet: updateBalance()");
      if (!_starknet || _etherContract == null) { this.logout(); }
      if (this.address.length > 0) {
        let response = await _etherContract.balanceOf(this.address);
        this.balance = response.balance;
        console.log(` - balance: ${this.ethBalance}`);
      }
    },

    logout() {
      console.log("starknet: logout()");
      if (_starknet != null) {
        _starknet.off("accountsChanged", (accounts) => this.handleAccountsChanged(context, accounts));
      }
      disconnect({clearLastWallet: true, clearDefaultWallet: true});
      this.$patch(_initialState);
      this.initialized = true;
    }
  }
});


function formatEther(n) {
  try {
    let bn = uint256.uint256ToBN(n).toString();
    let currentStr = "";
    if (bn.length > 18) {
        let extraZeros = bn.length - 18;
        currentStr = bn.substring(0, extraZeros) + "." + bn.substring(extraZeros + 1)
    } else {
        let zerosMissing = 18 - bn.length;
        currentStr = "0." + ("0").repeat(zerosMissing) + bn;
    }
    return currentStr;
  } catch (err) {
    return null;
  }
}