from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json

# from openhands.events.stream import EventStream, EventStreamSubscriber
# from openhands.events.serialization.event import event_to_dict, action_from_dict # Предположительно
# from openhands.events.action import Action # Предположительно
# from openhands.core.logger import openhands_logger as logger
# from openhands.server.dependencies import get_event_stream # Пример получения EventStream

# Пока используем моковые данные и логгер, т.к. реальные зависимости не подключены
class LoggerMock:
    def info(self, msg): print(f"INFO: {msg}")
    def error(self, msg): print(f"ERROR: {msg}")
    def debug(self, msg): print(f"DEBUG: {msg}")
    def warning(self, msg): print(f"WARNING: {msg}")

logger = LoggerMock()

# Моковый EventStream для начальной разработки
class EventStreamMock:
    async def add_event(self, event, source):
        logger.info(f"EventStreamMock: Event added - {event} from {source}")
        # Эмулируем обработку и ответ
        if event.get("actionType") == "ECHO_ACTION":
            return {"observationType": "ECHO_OBSERVATION", "details": event.get("details")}
        return None

    async def subscribe(self, subscriber_id, callback, callback_id):
        logger.info(f"EventStreamMock: Subscribed - {subscriber_id} with callback ID {callback_id}")
        # Здесь можно было бы эмулировать отправку событий подписчикам
        pass

    async def unsubscribe(self, subscriber_id, callback_id):
        logger.info(f"EventStreamMock: Unsubscribed - {subscriber_id} with callback ID {callback_id}")
        pass

# event_stream_instance = get_event_stream() # Это нужно будет настроить правильно
event_stream_instance = EventStreamMock() # Используем мок

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket connection closed: {websocket.client}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
            logger.debug(f"Sent message to {websocket.client}: {message}")
        except Exception as e:
            logger.error(f"Error sending message to {websocket.client}: {e}")


    async def broadcast(self, message: dict):
        # Этот метод пока не используется в базовой логике эхо, но может понадобиться
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to {connection.client}: {e}")


manager = ConnectionManager()

@router.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket, client_id: str = "unknown"):
    await manager.connect(websocket)
    # Уникальный ID для подписчика EventStream, если это необходимо
    # subscriber_callback_id = f"ws_client_{client_id}_{websocket.client.host}_{websocket.client.port}"

    # Подписка на EventStream (пока закомментировано, т.к. EventStream моковый)
    # await event_stream_instance.subscribe(
    #     EventStreamSubscriber.WEBSOCKET_GATEWAY, # Нужен новый тип подписчика?
    #     lambda event: manager.send_personal_message(event_to_dict(event), websocket),
    #     subscriber_callback_id
    # )

    try:
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Received message from {websocket.client}: {data}")
            try:
                message_data = json.loads(data)

                # Проверяем, является ли это ActionPayload (упрощенная проверка)
                if "type" in message_data and message_data["type"] == "action" and "actionType" in message_data:
                    # action = action_from_dict(message_data) # Это для реального EventStream
                    # await event_stream_instance.add_event(action, source=f"ws_client:{client_id}")

                    # Пока используем моковый EventStream напрямую
                    response = await event_stream_instance.add_event(message_data, source=f"ws_client:{client_id}")
                    if response:
                         # Формируем ObservationPayload на основе ответа мокового EventStream
                        observation_payload = {
                            "eventId": message_data.get("eventId", "") + "_obs", # Пример ID
                            "timestamp": message_data.get("timestamp", ""), # Пример timestamp
                            "source": "WebSocketGateway",
                            "type": "observation", # Указываем тип observation
                            "observationType": response.get("observationType"),
                            "details": response.get("details")
                        }
                        await manager.send_personal_message(observation_payload, websocket)
                    else:
                        # Если моковый стрим ничего не вернул, можно отправить подтверждение или ошибку
                        await manager.send_personal_message({"status": "action_received_but_no_direct_response"}, websocket)

                else:
                    logger.warning(f"Received non-action message or malformed action: {message_data}")
                    await manager.send_personal_message({"error": "Invalid message format, expected ActionPayload"}, websocket)

            except json.JSONDecodeError:
                logger.error(f"JSONDecodeError for message: {data}")
                await manager.send_personal_message({"error": "Invalid JSON format"}, websocket)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await manager.send_personal_message({"error": f"Server error: {str(e)}"}, websocket)

    except WebSocketDisconnect:
        logger.info(f"WebSocket {websocket.client} disconnected.")
    except Exception as e:
        logger.error(f"Unhandled exception in WebSocket connection {websocket.client}: {e}")
    finally:
        # await event_stream_instance.unsubscribe(EventStreamSubscriber.WEBSOCKET_GATEWAY, subscriber_callback_id)
        manager.disconnect(websocket)
        logger.info(f"Cleaned up connection for {websocket.client}")

# Для запуска этого файла отдельно (для тестирования, если необходимо)
# import uvicorn
# if __name__ == "__main__":
#     app_test = FastAPI()
#     app_test.include_router(router)
#     uvicorn.run(app_test, host="0.0.0.0", port=8000)
