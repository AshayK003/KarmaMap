export type UserRole = 'volunteer' | 'ngo';
export type GigStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ParticipationStatus =
  | 'pending'
  | 'joined'
  | 'checked_in'
  | 'completed'
  | 'cancelled';

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  skills: string[];
  karma_points: number;
  streak: number;
  location?: unknown;
  bio?: string;
  portfolio_slug?: string;
  created_at: string;
  updated_at: string;
}

export interface Gig {
  id: string;
  title: string;
  description: string;
  ngo_id: string;
  location?: unknown;
  required_skills: string[];
  volunteers_needed: number;
  volunteers_joined: number;
  gig_date: string;
  status: GigStatus;
  created_at: string;
  updated_at: string;
  profiles?: { name: string };
}

export interface Participation {
  id: string;
  volunteer_id: string;
  gig_id: string;
  status: ParticipationStatus;
  before_photo_url?: string;
  after_photo_url?: string;
  hours?: number;
  created_at: string;
  gigs?: Gig;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  read_status: boolean;
  gig_id?: string;
  created_at: string;
}

export interface NearbyGig {
  id: string;
  title: string;
  description: string;
  ngo_id: string;
  ngo_name: string;
  lat: number;
  lng: number;
  required_skills: string[];
  volunteers_needed: number;
  volunteers_joined: number;
  gig_date: string;
  status: GigStatus;
  distance_meters: number;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      gigs: { Row: Gig; Insert: Partial<Gig>; Update: Partial<Gig> };
      participations: {
        Row: Participation;
        Insert: Partial<Participation>;
        Update: Partial<Participation>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification>;
        Update: Partial<Notification>;
      };
    };
    Functions: {
      nearby_gigs: {
        Args: { lat: number; lng: number; radius_meters?: number };
        Returns: NearbyGig[];
      };
      update_profile_location: {
        Args: { lat: number; lng: number };
        Returns: void;
      };
    };
  };
};
