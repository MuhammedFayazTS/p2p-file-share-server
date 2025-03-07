export type User = {
  id?: string;
  userAgent: string;
  fullName: string;
  image: string;
  color: string;
  position: {
    top:string;
    left:string;
  }
};

export type UsersMap = Map<string, User>;
