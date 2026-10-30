const ALLOWED_TAGS = new Set([
	'B',
	'STRONG',
	'I',
	'EM',
	'U',
	'S',
	'STRIKE',
	'CODE',
	'BR'
]);

const BLOCKED_TAGS = new Set([
	'SCRIPT',
	'STYLE',
	'IFRAME',
	'OBJECT',
	'EMBED',
	'SVG',
	'MATH',
	'TEMPLATE',
	'IMG'
]);

function escapeText(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function cleanNode(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) {
		return escapeText(node.textContent ?? '');
	}
	if (node.nodeType !== Node.ELEMENT_NODE) {
		return '';
	}

	const element = node as HTMLElement;
	const tag = element.tagName.toUpperCase();
	if (BLOCKED_TAGS.has(tag)) {
		return '';
	}
	if (tag === 'BR') {
		return '<br>';
	}

	const children = Array.from(element.childNodes).map(cleanNode).join('');
	if (!ALLOWED_TAGS.has(tag)) {
		return children;
	}
	const normalized = tag === 'STRONG' ? 'strong' : tag === 'STRIKE' ? 's' : tag.toLowerCase();
	return `<${normalized}>${children}</${normalized}>`;
}

/**
 * Only inline formatting is allowed in package feature bullets.
 * All attributes are stripped so pasted/rich content cannot inject handlers.
 */
export function sanitizeRichText(value: string): string {
	if (!value) return '';
	if (typeof document === 'undefined') {
		return escapeText(value.replace(/<[^>]*>/g, ''));
	}
	const template = document.createElement('template');
	template.innerHTML = value;
	return Array.from(template.content.childNodes).map(cleanNode).join('');
}

export function isEmptyRichText(value: string): boolean {
	if (!value) return true;
	if (typeof document === 'undefined') {
		return value
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.trim().length === 0;
	}
	const template = document.createElement('template');
	template.innerHTML = value;
	return (template.content.textContent ?? '').replace(/\u00a0/g, ' ').trim().length === 0;
}
