package com.satisfactoryhost.orchestrator.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import java.io.IOException;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.Set;
import java.util.Map;
import java.util.HashMap;

@Component
public class WebSocketController implements WebSocketHandler {
    
    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
        sessions.add(session);
        System.out.println("WebSocket connection established: " + session.getId());
        
        // Send welcome message
        Map<String, Object> welcomeMessage = new HashMap<>();
        welcomeMessage.put("type", "connection");
        welcomeMessage.put("message", "Connected to Satisfactory Host Orchestrator");
        welcomeMessage.put("sessionId", session.getId());
        
        sendMessage(session, welcomeMessage);
    }
    
    @Override
    public void handleMessage(@NonNull WebSocketSession session, @NonNull WebSocketMessage<?> message) throws Exception {
        String payload = message.getPayload().toString();
        System.out.println("Received WebSocket message: " + payload);
        
        try {
            Map<String, Object> messageData = objectMapper.readValue(payload, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            String type = (String) messageData.get("type");
            
            switch (type) {
                case "subscribe":
                    handleSubscription(session, messageData);
                    break;
                case "ping":
                    handlePing(session);
                    break;
                default:
                    System.out.println("Unknown message type: " + type);
            }
        } catch (Exception e) {
            System.err.println("Error handling WebSocket message: " + e.getMessage());
        }
    }
    
    @Override
    public void handleTransportError(@NonNull WebSocketSession session, @NonNull Throwable exception) throws Exception {
        System.err.println("WebSocket transport error: " + exception.getMessage());
    }
    
    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus closeStatus) throws Exception {
        sessions.remove(session);
        System.out.println("WebSocket connection closed: " + session.getId());
    }
    
    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
    
    private void handleSubscription(WebSocketSession session, Map<String, Object> messageData) {
        String channel = (String) messageData.get("channel");
        String userId = (String) messageData.get("userId");
        
        // Store subscription info in session attributes
        session.getAttributes().put("channel", channel);
        session.getAttributes().put("userId", userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("type", "subscription_confirmed");
        response.put("channel", channel);
        response.put("userId", userId);
        
        sendMessage(session, response);
    }
    
    private void handlePing(WebSocketSession session) {
        Map<String, Object> pong = new HashMap<>();
        pong.put("type", "pong");
        pong.put("timestamp", System.currentTimeMillis());
        
        sendMessage(session, pong);
    }
    
    private void sendMessage(WebSocketSession session, Map<String, Object> message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            System.err.println("Error sending WebSocket message: " + e.getMessage());
        }
    }
    
    /**
     * Broadcast server status update to subscribed clients
     */
    public void broadcastServerStatusUpdate(String serverId, String userId, Map<String, Object> status) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "server_status_update");
        message.put("serverId", serverId);
        message.put("status", status);
        message.put("timestamp", System.currentTimeMillis());
        
        // Send to sessions subscribed to this user's updates
        sessions.stream()
            .filter(session -> userId.equals(session.getAttributes().get("userId")))
            .filter(session -> "servers".equals(session.getAttributes().get("channel")))
            .forEach(session -> sendMessage(session, message));
    }
    
    /**
     * Broadcast node status update to admin clients
     */
    public void broadcastNodeStatusUpdate(String nodeId, Map<String, Object> nodeStatus) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "node_status_update");
        message.put("nodeId", nodeId);
        message.put("status", nodeStatus);
        message.put("timestamp", System.currentTimeMillis());
        
        // Send to sessions subscribed to admin updates
        sessions.stream()
            .filter(session -> "admin".equals(session.getAttributes().get("channel")))
            .forEach(session -> sendMessage(session, message));
    }
    
    /**
     * Broadcast system-wide notification
     */
    public void broadcastNotification(String type, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "notification");
        notification.put("notificationType", type);
        notification.put("message", message);
        notification.put("timestamp", System.currentTimeMillis());
        
        // Send to all connected sessions
        sessions.forEach(session -> sendMessage(session, notification));
    }
}
