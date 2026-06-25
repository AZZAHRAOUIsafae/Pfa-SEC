export type UserRole = 'ADMIN' | 'TOPOGRAPHER' | 'CLIENT';

export interface Notification {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'MESSAGE' | 'PROJECT' | 'DOCUMENT' | 'ALERT' | 'LOGIN';
  content: string;
  timestamp: any;
  read: boolean;
  link?: string;
}

export interface User {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  age?: number;
  company?: string;
  address?: string;
  onigtNumber?: string;
  ice?: string;
  ifNum?: string;
  rc?: string;
  patente?: string;
  bio?: string;
  isTwoFactorEnabled?: boolean;
  inviteCode?: string;
  language?: string;
  blockedUids?: string[];
  country?: string;
  city?: string;
  createdAt?: any;
  status?: 'online' | 'offline';
  lastSeen?: any;
  adminId?: string; // ID of the Admin who manages this user
  adminEmail?: string; // Email of the Admin/Cabinet managing this user
  linkedTopographerId?: string; // For Clients: linked professional
  isBanned?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  loginCount?: number;
  rating?: number;
  reviewCount?: number;
  availability?: {
    days?: string[]; // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    hours?: { start: string; end: string }; // e.g. { start: '08:00', end: '17:00' }
    weatherRiskThreshold?: 'LOW' | 'MEDIUM' | 'HIGH';
    isAutoWeatherReschedulingEnabled?: boolean;
  };
  lastDeviceInfo?: {
    device: string;
    location: string;
    userAgent?: string;
  };
  loginHistory?: {
    id: string;
    location: string;
    device: string;
    timestamp: string;
  }[];
}

export interface Review {
  id: string;
  topographerId: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: any;
  projectId?: string;
}

export interface FailedLoginLog {
  id: string;
  email: string;
  timestamp: any;
  ip?: string;
  userAgent: string;
  reason: string;
}

export interface ConnectionRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string; // The Topographer/Admin being requested
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: any;
  type: 'CLIENT_TO_PRO';
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  topographerId: string;
  topographerName?: string;
  clientId: string;
  adminEmail?: string;
  adminId?: string;
  company?: string;
  location?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATION' | 'READY' | 'MODIFICATION_REQUESTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
  infoRequestComment?: string;
  clientResponseComment?: string;
  progress: number;
  deadline: string;
  description: string;
  createdAt?: any;
  startDate?: string;
  estimatedDelivery?: string;
  currentStep?: number;
  mapsUrl?: string;
  mapData?: string; // GeoJSON string for drawing
  coordinates?: {
    lat: number;
    lng: number;
    z?: number;
  };
  area?: number;
  perimeter?: number;
  orientation?: string;
  bounds?: { lat: number; lng: number }[];
  technicalFiles?: {
    id: string;
    name: string;
    date: string;
    size: string;
    pointsCount?: number;
  }[];
  hasReview?: boolean;
  ratingValue?: number;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  clientId?: string;
  topographerId?: string;
  name: string;
  company?: string;
  type: 'INVOICE' | 'QUOTE' | 'ORDER' | 'MAP' | 'PDF' | 'CAD' | 'PHOTO' | 'TECH' | 'FIELD' | 'PAYMENT_SCREENSHOT' | 'SIGNATURE';
  url: string;
  createdAt?: any;
  size: string;
  isSigned?: boolean;
  signatureDate?: any;
  signedBy?: string;
  signatureUrl?: string;
  signatureBase64?: string;
  paymentStatus?: 'UNPAID' | 'PAID' | 'PENDING';
  paymentDate?: any;
  paymentMethod?: 'STRIPE' | 'TRANSFER' | 'CASH';
  amount?: {
    ht: number;
    ttc: number;
    tva?: number;
    acompte?: number;
    reste?: number;
  };
  metadata?: any;
}

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  deletedForEveryone?: boolean;
  deletedBy?: string[];
}

export interface Intervention {
  id: string;
  projectId: string;
  projectName: string;
  topographerId: string;
  clientId: string;
  date: string;
  startTime: string;
  endTime?: string;
  title: string;
  description: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  type: 'LEVE' | 'BORNAGE' | 'IMPLANTATION' | 'VRD' | 'COPROPRIETE' | 'AUTRE';
  weatherCondition?: 'SUNNY' | 'CLOUDY' | 'RAINY' | 'STORM';
  isWeatherAtRisk?: boolean;
  scheduledEmails?: {
    recipient: string;
    type: 'CONFIRMATION' | 'WEATHER_ALERT' | 'REMINDER';
    sentAt?: string;
    status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'RESCHEDULED';
    subject: string;
    body: string;
  }[];
}

export interface AdminOTP {
  id?: string;
  userId: string;
  email: string;
  code: string;
  expiresAt: any; // Date, Timestamp, or ISO string
  createdAt?: any;
}

