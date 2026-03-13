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
		({ body, status }) => {
			console.log('Received request body:', body);
			const { title } = body as { title: string };
			const newTask: Task = {
				id: crypto.randomUUID(),
				title,
				isCompleted: false,
			};

			// เช็คว่าซ้ำกับ task ที่มีอยู่แล้วหรือไม่
			if (tasks.some((t) => t.title === title)) {
				return status(400, 'Task with the same title already exists');
			}

			tasks.push(newTask);

			return newTask;
		},
		{
			// กำหนด schema สำหรับ body ของ request
			body: t.Object({
				title: t.String(),
			}),
			response: {
				400: t.String(),
				200: t.Object({
					id: t.String(),
					title: t.String(),
					isCompleted: t.Boolean(),
				}),
				// สามารถเพิ่ม response อื่นๆ ได้ตามต้องการ
				// เช่น 500 สำหรับ error ภายใน server เป็นต้น
				500: t.String(),
			},
		},
	)
	// สำหรับการดูรายละเอียดของ task แต่ละตัว
	.get(
		'/tasks/:id',
		({ params, status }) => {
			const { id } = params;
			const task = tasks.find((t) => t.id === id);
			if (!task) {
				return status(404, 'Task not found');
			}
			return task;
		},
		{
			body: t.Object({
				id: t.String(),
			}),
			response: {
				404: t.String(),
				200: t.Object({
					id: t.String(),
					title: t.String(),
					isCompleted: t.Boolean(),
				}),
			},
		},
	)
	.patch(
		'/tasks/:id',
		({ params, body, status }) => {
			const { id } = params;
			const taskIndex = tasks.findIndex((t) => t.id === id);
			if (taskIndex === -1) {
				return status(404, 'Task not found');
			}

			const { title, isCompleted } = body as Partial<{ title: string; isCompleted: boolean }>;

			if (title !== undefined) {
				tasks[taskIndex].title = title;
			}
			if (isCompleted !== undefined) {
				tasks[taskIndex].isCompleted = isCompleted;
			}

			return tasks[taskIndex];
		},
		{
			params: t.Object({
				id: t.String(),
			}),
			body: t.Object({
				// Optional ไม่บังคับต้องมี แต่ถ้ามีก็ต้องเป็นชนิดที่กำหนด
				title: t.Optional(t.String()),
				isCompleted: t.Optional(t.Boolean()),
			}),
		},
	)
	.delete(
		'/tasks/:id',
		({ params, status }) => {
			const { id } = params as { id: string };
			const taskIndex = tasks.findIndex((t) => t.id === id);
			if (taskIndex === -1) {
				return status(404, 'Task not found');
			}

			tasks.splice(taskIndex, 1);
			return { message: 'Task deleted successfully' };
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	)
	.compile();
