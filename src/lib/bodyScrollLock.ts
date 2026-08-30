let lockCount = 0;

/**
 * Prevents the page behind an open <dialog> from scrolling. Native showModal()
 * blocks interaction with the rest of the page but some browsers still let wheel/
 * touch scroll the body underneath, so we lock it explicitly. Reference-counted
 * so multiple modals can never uncancel each other's lock.
 */
export function lockBodyScroll() {
	if (lockCount === 0) {
		document.body.style.overflow = 'hidden';
	}
	lockCount++;

	return () => {
		lockCount = Math.max(0, lockCount - 1);
		if (lockCount === 0) {
			document.body.style.overflow = '';
		}
	};
}
