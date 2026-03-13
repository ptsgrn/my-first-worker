import { Elysia, t } from 'elysia';
import cors from '@elysiajs/cors';
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker';

interface Task {
	id: string;
	title: string;
	isCompleted: boolean;
}

let tasks: Task[] = [];

export default new Elysia({
	adapter: CloudflareAdapter,
})
	.use(cors())
	.get('/', () => 'สวัสดีฉันมาจากประเทศไทย')
	.get('/tasks', () => tasks)
	.post(
		'/tasks',
		({ body }) => {
			console.log('Received request body:', body);
			const { title } = body as { title: string };
			const newTask: Task = {
				id: crypto.randomUUID(),
				title,
				isCompleted: false,
			};

			tasks.push(newTask);

			return newTask;
		},
		{
			// กำหนด schema สำหรับ body ของ request
			body: t.Object({
				title: t.String(),
			}),
		},
	)
	.compile();
