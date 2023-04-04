# Tuxit (Vue3 Frontend) [Work in Progress]

Tuxit allows to build trustless P2P Games using state-channels over StarkNet.

This frontend currently allows to:
 - **Create GameRooms** (*might need reload after confirmed transaction*)
 - **Join GameRooms**
 - **Play a test Turn-Based game over state channels**
 - **Verify the result on-chain** (*some results might fail to verify*)

<img width="992" alt="Game" src="https://user-images.githubusercontent.com/105830708/229884460-409cc560-6be1-4db7-b959-97247ef9ed71.png">

Tuxit works without a middle server. All player interactions are fully P2P over WebRTC (using BitTorrent for handshaking), with StarkNet providing settlement and security guarantees.

Live Test: https://tuxit-tech-demos.vercel.app/
