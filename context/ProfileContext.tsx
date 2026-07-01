import React, { createContext, useContext, useState } from "react";

export type Message = {
  id: string;
  text: string;
  time: string;
  sent: boolean;
  read?: boolean;
  edited?: boolean;
  imageUri?: string;
};

const FAKE_CHAT: Message[] = [
  { id: "f1",  text: "Hi",                              time: "10:00 AM", sent: true,  read: true  },
  { id: "f2",  text: "Hi",                              time: "10:01 AM", sent: false              },
  { id: "f3",  text: "How are you?",                    time: "10:02 AM", sent: true,  read: true  },
  { id: "f4",  text: "I am fine.",                      time: "10:03 AM", sent: false              },
  { id: "f5",  text: "What are you doing?",             time: "10:05 AM", sent: true,  read: true  },
  { id: "f6",  text: "Nothing just chilling bhai 😎",   time: "10:06 AM", sent: false              },
  { id: "f7",  text: "Nice 😄",                         time: "10:07 AM", sent: true,  read: true  },
  { id: "f8",  text: "Haan bhai, tu bata kya chal rha", time: "10:08 AM", sent: false              },
  { id: "f9",  text: "Kuch nhi yaar bas kaam",          time: "10:10 AM", sent: true,  read: true  },
  { id: "f10", text: "Achha samjha",                    time: "10:11 AM", sent: false              },
  { id: "f11", text: "Sale seen krrha he bss",          time: "11:28 AM", sent: false              },
  { id: "f12", text: "ye done ha ab mat boLna ok",      time: "1:36 PM",  sent: true,  read: true  },
  { id: "f13", text: "ok",                              time: "1:36 PM",  sent: true,  read: true  },
  { id: "f14", text: "H",                               time: "1:37 PM",  sent: false              },
  { id: "f15", text: "HD se jyda slow",                 time: "1:38 PM",  sent: false              },
];

type AppContextType = {
  myName: string;
  myAvatarUri: string | null;
  setMyName: (v: string) => void;
  setMyAvatarUri: (v: string | null) => void;

  theirName: string;
  theirPhone: string;
  theirUsername: string;
  theirBio: string;
  theirAvatarUri: string | null;
  updateTheirProfile: (u: Partial<{ name: string; phone: string; username: string; bio: string; avatarUri: string | null }>) => void;

  messages: Message[];
  addMessage: (msg: Message) => void;
  editMessage: (id: string, text: string) => void;
  deleteMessage: (id: string) => void;
  flipSender: (id: string) => void;
  setMessages: (msgs: Message[]) => void;
  clearMessages: () => void;

  darkMode: boolean;
  toggleDarkMode: () => void;
};

const AppContext = createContext<AppContextType>({} as AppContextType);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [myName, setMyName] = useState("You");
  const [myAvatarUri, setMyAvatarUri] = useState<string | null>(null);

  const [theirName, setTheirName] = useState("FLASH");
  const [theirPhone, setTheirPhone] = useState("+91 84389 52382");
  const [theirUsername, setTheirUsername] = useState("@flash_user");
  const [theirBio, setTheirBio] = useState("Hey there! I am using Telegram.");
  const [theirAvatarUri, setTheirAvatarUri] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>(FAKE_CHAT);
  const [darkMode, setDarkMode] = useState(false);

  function updateTheirProfile(u: Partial<{ name: string; phone: string; username: string; bio: string; avatarUri: string | null }>) {
    if (u.name !== undefined) setTheirName(u.name);
    if (u.phone !== undefined) setTheirPhone(u.phone);
    if (u.username !== undefined) setTheirUsername(u.username);
    if (u.bio !== undefined) setTheirBio(u.bio);
    if (u.avatarUri !== undefined) setTheirAvatarUri(u.avatarUri);
  }

  function addMessage(msg: Message) {
    setMessages((p) => [...p, msg]);
  }

  function editMessage(id: string, text: string) {
    setMessages((p) => p.map((m) => m.id === id ? { ...m, text, edited: true } : m));
  }

  function deleteMessage(id: string) {
    setMessages((p) => p.filter((m) => m.id !== id));
  }

  function flipSender(id: string) {
    setMessages((p) => p.map((m) => m.id === id ? { ...m, sent: !m.sent } : m));
  }

  function clearMessages() {
    setMessages([]);
  }

  function toggleDarkMode() {
    setDarkMode((v) => !v);
  }

  return (
    <AppContext.Provider value={{
      myName, myAvatarUri, setMyName, setMyAvatarUri,
      theirName, theirPhone, theirUsername, theirBio, theirAvatarUri, updateTheirProfile,
      messages, addMessage, editMessage, deleteMessage, flipSender, setMessages, clearMessages,
      darkMode, toggleDarkMode,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useProfile() {
  return useContext(AppContext);
}
