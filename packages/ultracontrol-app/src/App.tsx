import { useEffect, useState } from 'react';
import { Header } from './components/header/Header';
import { Chat } from './components/chat/Chat.client';
import eventService from './lib/services/EventService'; // Import EventService

function App() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Connect to WebSocket server when the component mounts
    eventService.connect();

    // Disconnect when the component unmounts
    return () => {
      eventService.disconnect();
    };
  }, []);

  // useEffect to test sending an echo action after connection
  // This is for testing purposes and should be removed or adapted later.
  useEffect(() => {
    if (isClient) {
      const sendEcho = () => {
        // Check if connected, or use a store to listen to connection status
        // For simplicity, we'll just try sending after a short delay.
        // A more robust way would be to listen to `isEventServiceConnected` store.
        console.log('Attempting to send ECHO_ACTION in 3 seconds...');
        eventService.sendAction('ECHO_ACTION', { message: 'Hello from UltraControl Client!' }, 'App.tsx');
      };

      const i = setInterval(() => {
        // A more robust way to check connection:
        // import { useStore } from '@nanostores/react';
        // import { isEventServiceConnected } from './lib/services/EventService';
        // const connected = useStore(isEventServiceConnected);
        // if(connected) { ... clearInterval(i) ... }
        // For now, just log from EventService
        if(eventService['socket'] && eventService['socket'].readyState === WebSocket.OPEN){
          sendEcho()
          clearInterval(i)
        } else {
          console.log("EventService not connected yet, retrying echo send...")
        }
      }, 3000);
      return () => clearInterval(i);
    }
  }, [isClient]);


  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      {isClient && <Chat />}
    </div>
  );
}

export default App;