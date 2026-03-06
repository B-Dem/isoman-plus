/**
 * Constructs the checksum download URL for an ISO
 * @param downloadLink - ISO download link path
 * @param checksumType - Checksum type (sha256, sha512, md5)
 * @returns Full checksum URL or null if no checksum type
 */
export function getChecksumUrl(
  downloadLink: string,
  checksumType: string | null | undefined,
): string | null {
  return checksumType ? `${downloadLink}.${checksumType}` : null;
}

/**
 * Gets the full download URL including origin
 * @param downloadLink - Relative download link path
 * @returns Full URL with origin
 */
export function getFullDownloadUrl(downloadLink: string): string {
  return `${window.location.origin}${downloadLink}`;
}

/**
 * Gets the full checksum URL including origin
 * @param downloadLink - Relative download link path
 * @param checksumType - Checksum type
 * @returns Full checksum URL with origin or null
 */
export function getFullChecksumUrl(
  downloadLink: string,
  checksumType: string | null | undefined,
): string | null {
  const checksumPath = getChecksumUrl(downloadLink, checksumType);
  return checksumPath ? getFullDownloadUrl(checksumPath) : null;
}
// Fonction qui détecte le système d'exploitation d'après le nom de l'ISO
export function getOsLogo(isoName: string): string | null {
  // On met tout en minuscules pour faciliter la recherche
  const name = isoName.toLowerCase();
  
  // --- SYSTÈMES LINUX ---
  if (name.includes('debian')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg';
  if (name.includes('ubuntu')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ubuntu/ubuntu-original.svg';
  if (name.includes('kali')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/kalilinux/kalilinux-original.svg';
  if (name.includes('mint')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linuxmint/linuxmint-original.svg';
  if (name.includes('arch')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/archlinux/archlinux-original.svg';
  if (name.includes('alpine')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/alpinelinux/alpinelinux-original.svg';
  if (name.includes('centos')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/centos/centos-original.svg';
  if (name.includes('fedora')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fedora/fedora-original.svg';
  if (name.includes('rocky')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/rockylinux/rockylinux-original.svg';
  if (name.includes('redhat') || name.includes('rhel')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redhat/redhat-original.svg';
  if (name.includes('suse') || name.includes('sles')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/suse/suse-original.svg';
  
  // --- SYSTÈMES WINDOWS ---
  // Pour Windows 11 (le logo bleu centralisé)
  if (name.includes('win11') || name.includes('windows 11') || name.includes('windows_11')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg';
  // Pour tous les autres Windows (7, 10, Server) : Le logo bleu classique plat
  if (name.includes('win') || name.includes('windows')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows8/windows8-original.svg';
  
  // --- HYPERVISEURS ET RESEAU ---
  if (name.includes('proxmox') || name.includes('pve')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/proxmox/proxmox-original.svg';
  // Utilisation de Wikipédia pour ceux qui ne sont pas dans Devicon
  if (name.includes('pfsense')) return 'https://upload.wikimedia.org/wikipedia/commons/e/e0/PfSense_logo.svg';
  if (name.includes('truenas') || name.includes('freenas')) return 'https://upload.wikimedia.org/wikipedia/commons/4/4b/TrueNAS_logo.svg';
  if (name.includes('vmware') || name.includes('esxi')) return 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Vmware.svg';

  // Si on ne reconnaît pas le système, on renvoie null (l'interface affichera l'icône de disque générique)
  return null;
}