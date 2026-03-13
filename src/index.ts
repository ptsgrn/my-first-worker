import { Elysia, t } from 'elysia';
import cors from '@elysiajs/cors';
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker';
import { env } from 'cloudflare:workers';
import openapi from '@elysiajs/openapi';

interface Task {
	id: string;
	title: string;
	isCompleted: boolean;
}

const users: Record<string, string> = {
	'api-key-123': 'user:A:',
	'api-key-456': 'user:B:',
};

export default new Elysia({
	adapter: CloudflareAdapter,
})
	// สร้าง OpenAPI Specification สำหรับ API ของเรา
	// แล้วเข้าไปดูที่ /openapi
	.use(openapi())
	// แก้ติดคอ สำหรับขอข้ามโดเมน (CORS)
	.use(cors())
	.macro({
		auth: {
			resolve({ headers, status }) {
				if (!headers['x-api-key']) {
					return status(401, 'Unauthorized: API key is missing');
				}
				const user = users[headers['x-api-key']];
				if (!user) {
					return status(403, 'Forbidden: Invalid API key');
				}
				return { user }; // สามารถ return ข้อมูลผู้ใช้หรือสิทธิ์การเข้าถึงได้ตามต้องการ
			},
		},
	})
	.get('/', async () => 'สวัสดีฉันมาจากประเทศไทย')
	// API key easy authentication (สำหรับตัวอย่างนี้ใช้แบบง่ายๆ แต่ใน production ควรใช้วิธีที่ปลอดภัยกว่า)
	.get(
		'/tasks',
		async ({ user }) => {
			const list = await env.tasks.list({
				prefix: user, // กรองเฉพาะ task ที่เกี่ยวข้องกับผู้ใช้ที่กำหนด (ถ้าต้องการ) หรือไม่ต้องกรองเลยก็ได้
			});
			const tasks: Task[] = [];
			for (const key of list.keys) {
				const value = await env.tasks.get(key.name); // ดึงข้อมูล task ตาม key ที่ได้จาก list
				if (value) {
					tasks.push(JSON.parse(value));
				}
			}
			return tasks;
		},
		{
			auth: true, // ใช้ macro auth ที่เราสร้างไว้
		},
	)
	.post(
		'/tasks',
		async ({ body, status, user }) => {
			const { title } = body;
			const newTask: Task = {
				id: crypto.randomUUID(),
				title,
				isCompleted: false,
			};

			// บันทึก task ใหม่ลง KV
			await env.tasks.put(user + newTask.id, JSON.stringify(newTask));
			console.log(`Task created: ${newTask.id} for user ${user}`);
			return newTask;
		},
		{
			auth: true,
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
		async ({ params, status, user }) => {
			const { id } = params;
			const taskData = await env.tasks.get(user + id);
			if (!taskData) {
				return status(404, 'Task not found');
			}
			return JSON.parse(taskData);
		},
		{
			auth: true,
			params: t.Object({
				id: t.String(),
			}),
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
		async ({ params, body, status, user }) => {
			const { id } = params;
			const taskData = await env.tasks.get(user + id);
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
			await env.tasks.put(user + id, JSON.stringify(task));

			return task;
		},
		{
			auth: true,
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
		async ({ params, status, user }) => {
			const { id } = params as { id: string };
			const taskData = await env.tasks.get(user + id);
			if (!taskData) {
				return status(404, 'Task not found');
			}
			await env.tasks.delete(user + id);
			return { message: 'Task deleted successfully' };
		},
		{
			auth: true,
			params: t.Object({
				id: t.String(),
			}),
		},
	)
	.compile();
