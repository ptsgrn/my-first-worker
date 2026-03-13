import { Elysia, t } from 'elysia';
import cors from '@elysiajs/cors';
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker';
import { env } from 'cloudflare:workers';

interface Task {
	id: string;
	title: string;
	isCompleted: boolean;
}

export default new Elysia({
	adapter: CloudflareAdapter,
})
	.use(cors())
	.get('/', async () => 'สวัสดีฉันมาจากประเทศไทย')
	.get('/tasks', async () => {
		const list = await env.tasks.list();
		const tasks: Task[] = [];
		for (const key of list.keys) {
			const value = await env.tasks.get(key.name);
			if (value) {
				tasks.push(JSON.parse(value));
			}
		}
		return tasks;
	})
	.post(
		'/tasks',
		async ({ body, status }) => {
			const { title } = body;
			const newTask: Task = {
				id: crypto.randomUUID(),
				title,
				isCompleted: false,
			};

			// บันทึก task ใหม่ลง KV
			await env.tasks.put(newTask.id, JSON.stringify(newTask));

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
		async ({ params, status }) => {
			const { id } = params;
			const taskData = await env.tasks.get(id);
			if (!taskData) {
				return status(404, 'Task not found');
			}
			return JSON.parse(taskData);
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
		async ({ params, body, status }) => {
			const { id } = params;
			const taskData = await env.tasks.get(id);
			if (!taskData) {
				return status(404, 'Task not found');
			}

			const task: Task = JSON.parse(taskData);
			const { title, isCompleted } = body;

			// อัปเดตข้อมูลที่ได้รับมา (ถ้ามี)
			if (title !== undefined) {
				task.title = title;
			}
			if (isCompleted !== undefined) {
				task.isCompleted = isCompleted;
			}

			// บันทึก task ที่อัปเดตแล้วลง KV
			await env.tasks.put(id, JSON.stringify(task));

			return task;
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
		async ({ params, status }) => {
			const { id } = params as { id: string };
			const taskData = await env.tasks.get(id);
			if (!taskData) {
				return status(404, 'Task not found');
			}
			await env.tasks.delete(id);
			return { message: 'Task deleted successfully' };
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	)
	.compile();
