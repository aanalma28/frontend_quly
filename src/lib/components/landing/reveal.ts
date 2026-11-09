export function reveal(node: HTMLElement) {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	node.classList.add('reveal-ready');
	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) {
				node.classList.add('is-visible');
				observer.unobserve(node);
			}
		},
		{ threshold: 0.14 }
	);

	observer.observe(node);
	return {
		destroy() {
			observer.disconnect();
		}
	};
}
