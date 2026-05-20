import type { User } from '@/types'

type AvatarSeedUser = Pick<User, 'id' | 'email' | 'username'>

export function defaultAvatarSeed(user: AvatarSeedUser | null | undefined): string {
  if (!user) {
    return 'user:anonymous'
  }

  const parts = [
    user.id ? `id:${user.id}` : '',
    user.email?.trim() ? `email:${user.email.trim().toLowerCase()}` : '',
    user.username?.trim() ? `name:${user.username.trim()}` : ''
  ].filter(Boolean)

  return parts.join('|') || 'user:anonymous'
}
