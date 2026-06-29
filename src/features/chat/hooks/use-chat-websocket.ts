import { useEffect, useRef, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";
import { chatKeys } from "./use-chat-history";
import { Message, SendMessageRequest } from "../../../lib/api/chat";
import { WS_BASE_URL } from "../../../lib/api/client";

export const useChatWebSocket = (otherUserId: number) => {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const queryClient = useQueryClient();

    const connect = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync("access_token");
            if (!token) return;

            // Connect to the WebSocket endpoint, passing token as query param
            const wsUrl = `${WS_BASE_URL}/v1/chat/ws?token=${token}`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("Chat WebSocket connected");
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // The backend sends back the Message object.
                    // We need to add it to the React Query cache.
                    if (data && data.id && data.message) {
                        const message = data as Message;
                        
                        // Only add to cache if the message is relevant to this chat
                        if (message.sender_id === otherUserId || message.receiver_id === otherUserId) {
                            queryClient.setQueryData(chatKeys.history(otherUserId), (oldData: any) => {
                                if (!oldData) return oldData;
                                
                                // Insert the new message at the very beginning of the first page
                                // because page 0, index 0 is the newest message
                                const newPages = [...oldData.pages];
                                if (newPages.length > 0) {
                                    newPages[0] = [message, ...newPages[0]];
                                } else {
                                    newPages[0] = [message];
                                }
                                
                                return {
                                    ...oldData,
                                    pages: newPages,
                                };
                            });
                        }
                    }
                } catch (e) {
                    console.error("Error parsing websocket message", e);
                }
            };

            ws.onclose = () => {
                console.log("Chat WebSocket disconnected");
                setIsConnected(false);
                // Optionally implement reconnection logic here
            };

            ws.onerror = (e) => {
                console.error("WebSocket error:", e);
                setIsConnected(false);
            };

            wsRef.current = ws;
        } catch (e) {
            console.error("Failed to setup WebSocket", e);
        }
    }, [otherUserId, queryClient]);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((text: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const payload: SendMessageRequest = {
                receiver_id: otherUserId,
                message: text,
            };
            wsRef.current.send(JSON.stringify(payload));
        } else {
            console.warn("WebSocket not connected, cannot send message");
        }
    }, [otherUserId]);

    return {
        isConnected,
        sendMessage,
    };
};
