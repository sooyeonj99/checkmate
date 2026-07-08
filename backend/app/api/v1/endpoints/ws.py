"""WebSocket — 실시간 분석 완료 알림"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/ws", tags=["WebSocket"])


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: int, ws: WebSocket):
        conns = self._connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)

    async def send(self, user_id: int, data: dict):
        for ws in list(self._connections.get(user_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id, ws)


manager = ConnectionManager()


@router.websocket("/{user_id}")
async def ws_endpoint(user_id: int, websocket: WebSocket):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive ping 처리
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
