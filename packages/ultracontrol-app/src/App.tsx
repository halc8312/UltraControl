import { useEffect, useState } from 'react';
import { Header } from './components/header/Header';
import { Chat } from './components/chat/Chat.client';

function App() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      {isClient && <Chat />}
    </div>
  );
}

export default App;