import { TasksKanbanClient } from '@/components/TasksKanbanClient';

export default async function TasksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TasksKanbanClient orgSlug={slug} />;
}
