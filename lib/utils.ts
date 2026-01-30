import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ChannelsIcon,
  ChatsIcon,
  CommunitiesIcon,
  MetaAI,
  StatusIcon,
} from "@/components/icons/chats-icon";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const chatCategories = [
  {
    title: "All",
    isActive: true,
  },
  {
    title: "Unread",
    isActive: false,
  },
  {
    title: "Favourites",
    isActive: false,
  },
  {
    title: "Groups",
    isActive: false,
  },
];

export const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Chats",
      url: "/chats",
      icon: ChatsIcon,
      unread: {
        status: true,
        count: 99,
      },
      isActive: true,
    },
    {
      title: "Status",
      url: "/status",
      icon: StatusIcon,
      unread: {
        status: true,
        count: 0,
      },
      isActive: false,
    },
    {
      title: "Channels",
      url: "/channels",
      icon: ChannelsIcon,
      unread: {
        status: true,
        count: 0,
      },
      isActive: false,
    },
    {
      title: "Communities",
      url: "/communites",
      icon: CommunitiesIcon,
      unread: {
        status: true,
        count: 0,
      },
      isActive: false,
    },
    {
      title: "Meta AI",
      url: "#",
      icon: MetaAI,
      unread: {
        status: true,
        count: 0,
      },
      isActive: false,
    },
  ],
  mails: [
    {
      name: "William Smith",
      avatar: "/images/1.jpg",
      date: "09:34 AM",
      isPinned: true,
      unreadStatusCount: 1,
      teaser:
        "Hi team, just a reminder about our meeting tomorrow at 10 AM.\nPlease come prepared with your project updates.",
    },
    {
      name: "Alice Smith",
      avatar: "/images/2.jpg",
      date: "Yesterday",
      isPinned: true,
      unreadStatusCount: 3,
      teaser:
        "Thanks for the update. The progress looks great so far.\nLet's schedule a call to discuss the next steps.",
    },
    {
      name: "Bob Johnson",
      avatar: "",
      date: "2 days ago",
      isPinned: true,
      unreadStatusCount: 0,
      teaser:
        "Hey everyone! I'm thinking of organizing a team outing this weekend.\nWould you be interested in a hiking trip or a beach day?",
    },
    {
      name: "Emily Davis",
      avatar: "/images/3.jpg",
      date: "2 days ago",
      unreadStatusCount: 5,
      teaser:
        "I've reviewed the budget numbers you sent over.\nCan we set up a quick call to discuss some potential adjustments?",
    },
    {
      name: "Michael Wilson",
      avatar: "",
      date: "1 week ago",
      unreadStatusCount: 0,
      teaser:
        "Please join us for an all-hands meeting this Friday at 3 PM.\nWe have some exciting news to share about the company's future.",
    },
    {
      name: "Sarah Brown",
      avatar: "",
      date: "1 week ago",
      unreadStatusCount: 2,
      teaser:
        "Thank you for sending over the proposal. I've reviewed it and have some thoughts.\nCould we schedule a meeting to discuss my feedback in detail?",
    },
    {
      name: "David Lee",
      avatar: "",
      date: "1 week ago",
      unreadStatusCount: 0,
      teaser:
        "I've been brainstorming and came up with an interesting project concept.\nDo you have time this week to discuss its potential impact and feasibility?",
    },
    {
      name: "Olivia Wilson",
      avatar: "",
      date: "1 week ago",
      unreadStatusCount: 1,
      teaser:
        "Just a heads up that I'll be taking a two-week vacation next month.\nI'll make sure all my projects are up to date before I leave.",
    },
    {
      name: "James Martin",
      avatar: "",
      date: "1 week ago",
      unreadStatusCount: 4,
      teaser:
        "I've completed the registration for the upcoming tech conference.\nLet me know if you need any additional information from my end.",
    },
    {
      name: "Sophia White",
      avatar: "",
      date: "1 week ago",
      unreadStatusCount: 0,
      teaser:
        "To celebrate our recent project success, I'd like to organize a team dinner.\nAre you available next Friday evening? Please let me know your preferences.",
    },
  ],
  channels: [
    {
      name: "WhatsApp",
      avatar: "/images/whatsapp.jpg",
      date: "Yesterday",
      unreadStatusCount: 0,
      teaser: "Channel Crush: MotoGP All bike, no brakes. MotoGP is t...",
    },
    {
      name: "MR. CUPZ TIPZ",
      avatar: "/images/tipz.jpg",
      date: "8:25 PM",
      unreadStatusCount: 12,
      teaser: "Well ANALYZED 15 ODDS on Ilotbet UCL Games HIG...",
    },
    {
      name: "UCL Fantasy",
      avatar: "/images/uefafantasy.jpg",
      date: "8:06 PM",
      unreadStatusCount: 3,
      teaser: "Vinícius Júnior produced 20 points in Matchday 7 - m...",
    },
    {
      name: "BRODA SHAGGI 😜",
      avatar: "/images/brodashaggi.jpg",
      date: "6:15 PM",
      unreadStatusCount: 1,
      teaser: "Photo",
    },
    {
      name: "Backend Jobs",
      avatar: "/images/backend_jobs.jpg",
      date: "5:12 PM",
      unreadStatusCount: 4,
      teaser: "Need someone who can create Wordpress website with ...",
    },
    {
      name: "CryptoBert Airdrops",
      avatar: "/images/cryptobert_airdrops.jpg",
      date: "3:58 PM",
      unreadStatusCount: 6,
      teaser: "Photo",
    },
    {
      name: "Sports Illustrated FC | Man City",
      avatar: "/images/sport_ill.jpg",
      date: "9:13 AM",
      unreadStatusCount: 2,
      teaser: "TRANSFER GOSSIP: The list of suitors for Omar Marm...",
    },
    {
      name: "UEFA Champions League",
      avatar: "/images/uefa.jpg",
      date: "12:41 AM",
      unreadStatusCount: 6,
      teaser: "Favourite Wednesday goal? ⚽ 👉 https://www.u...",
    },
  ],
};
