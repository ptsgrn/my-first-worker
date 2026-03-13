import { Elysia } from 'elysia';
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker';

export default new Elysia({
	adapter: CloudflareAdapter,
})
	.get('/', () => 'สวัสดีฉันมาจากประเทศไทย')
	// This is required to make Elysia work on Cloudflare Worker
	.compile();
