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
	// สำหรับการดูรายละเอียดของ task แต่ละตัว
	.get('/tasks/:id', ({ params, status }) => {
		const { id } = params as { id: string };
		const task = tasks.find((t) => t.id === id);
		if (!task) {
			status(404, 'Task not found');
		}
		return task;
	})
	.patch('/tasks/:id', ({ params, body, status }) => {
		const { id } = params as { id: string };
		const taskIndex = tasks.findIndex((t) => t.id === id);
		if (taskIndex === -1) {
			status(404, 'Task not found');
			return;
		}

		const { title, isCompleted } = body as Partial<{ title: string; isCompleted: boolean }>;

		if (title !== undefined) {
			tasks[taskIndex].title = title;
		}
		if (isCompleted !== undefined) {
			tasks[taskIndex].isCompleted = isCompleted;
		}

		return tasks[taskIndex];
	})
	.delete('/tasks/:id', ({ params, status }) => {
		const { id } = params as { id: string };
		const taskIndex = tasks.findIndex((t) => t.id === id);
		if (taskIndex === -1) {
			status(404, 'Task not found');
			return;
		}

		tasks.splice(taskIndex, 1);
		return { message: 'Task deleted successfully' };
	})
	.compile();
