export interface Creator {
  id:             string;
  channel_id:     string;
  nome:           string | null;
  canal:          string | null;
  avatar_url:     string | null;
  especialidade:  string | null;
  numero_videos:  number | null;
  destaque:       boolean;
  cached_at:      string | null;
  created_at:     string;
}

export interface FollowedCreator {
  id:          string;
  user_id:     string;
  creator_id:  string;
  followed_at: string;
}
