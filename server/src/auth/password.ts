import bcrypt from "bcryptjs";

// BR-15, NFR-03: passwords are stored only as salted bcrypt hashes.
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Compared against when the email is unknown, so a failed login takes the same time
// whether or not the account exists (FR-01: the response must not reveal it).
export const UNKNOWN_USER_HASH = bcrypt.hashSync("unknown-user-placeholder", BCRYPT_COST);
