// Notices when the browser itself forbids direct connections (0.9.91.17, browser support research §A.3).
//
// Voice, cameras and streams go peer to peer with STUN only. With Chromium's WebRTC policy "Disable non-proxied UDP"
// (a Brave / Vivaldi setting, uBlock Origin's "Prevent WebRTC from leaking local IP addresses", Opera's VPN, company
// policies) the browser gathers no network address at all: the connection stays "new" forever and never reports
// "failed", so the person waited without any explanation. A normal browser always gathers at least one host
// candidate (an mDNS `.local` name), so "gathering finished with zero candidates" means "blocked by the browser".

/** The part of RTCPeerConnection this needs (a fake one in tests). */
export interface IceSource {
  readonly iceGatheringState: RTCIceGatheringState;
  addEventListener(type: 'icecandidate' | 'icegatheringstatechange', listener: (event: { candidate?: unknown }) => void): void;
}

/** Calls `onBlocked` once if gathering completes without a single local candidate. */
export function watchIceBlocked(pc: IceSource, onBlocked: () => void): void {
  let seen = 0;
  let told = false;
  pc.addEventListener('icecandidate', (event) => {
    if (event.candidate) seen++;
  });
  pc.addEventListener('icegatheringstatechange', () => {
    if (told || pc.iceGatheringState !== 'complete' || seen > 0) return;
    told = true;
    onBlocked();
  });
}
