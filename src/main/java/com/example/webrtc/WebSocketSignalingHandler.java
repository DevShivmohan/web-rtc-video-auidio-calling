package com.example.webrtc;

import org.json.JSONObject;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


public class WebSocketSignalingHandler extends TextWebSocketHandler {
    private final Map<String, WebSocketSession> userSessions = new ConcurrentHashMap<>();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JSONObject payload = new JSONObject(message.getPayload());
        String type = payload.getString("type");

        switch (type) {
            case "register":
                String userId = payload.getString("userId");
                userSessions.put(userId, session);
                break;

            case "call":
                String to = payload.getString("to");
                if (userSessions.containsKey(to)) {
                    WebSocketSession recipientSession = userSessions.get(to);
                    JSONObject callMessage = new JSONObject();
                    callMessage.put("type", "call");
                    callMessage.put("from", payload.getString("from"));
                    recipientSession.sendMessage(new TextMessage(callMessage.toString()));
                }
                break;

            case "response":
                String toResponse = payload.getString("to");
                if (userSessions.containsKey(toResponse)) {
                    WebSocketSession recipientSession = userSessions.get(toResponse);
                    recipientSession.sendMessage(new TextMessage(payload.toString()));
                }
                break;

            case "offer":
            case "answer":
            case "candidate":
                String recipient = payload.getString("to");
                if (userSessions.containsKey(recipient)) {
                    WebSocketSession recipientSession = userSessions.get(recipient);
                    recipientSession.sendMessage(new TextMessage(payload.toString()));
                }
                break;
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        userSessions.entrySet().removeIf(entry -> entry.getValue().equals(session));
    }
}
