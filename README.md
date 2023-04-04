# Tuxit (Vue3 Frontend)

Tuxit allows to build trustless P2P Games using state-channels over StarkNet.
This frontend currently allows to:
 - Create GameRooms
 - Join GameRooms
 - Play a test Turn-Based game over state channels
 - Verify the result on-chain
 
Tuxit works without a middle server. All player interactions are fully P2P over WebRTC (using BitTorrent for handshaking), with StarkNet providing settlement and security guarantees.

Live Test: https://tuxit-tech-demos.vercel.app/
