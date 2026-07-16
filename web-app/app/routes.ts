import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("content", "routes/content.tsx"),
  route("content/:stageId", "routes/content-stage.tsx"),
  route("content/:stageId/:subjectId", "routes/content-subject.tsx"),
  route("study", "routes/study.tsx"),
  route("me", "routes/me.tsx"),
  route("visual/:topicId", "routes/visualization.tsx"),
] satisfies RouteConfig;
