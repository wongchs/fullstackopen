const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const middleware = require("../utils/middleware");

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({}).populate("user", {
    username: 1,
    name: 1,
    id: 1,
  });
  response.json(blogs);
});

blogsRouter.get("/:id", async (request, response) => {
  const blog = await Blog.findById(request.params.id).populate("user", {
    username: 1,
    name: 1,
    id: 1,
  });

  if (blog) {
    response.json(blog);
  } else {
    response.status(404).json({ error: "blog not found" }).end();
  }
});

blogsRouter.post("/", middleware.userExtractor, async (request, response) => {
  const body = request.body;

  const user = request.user;

  if (!body.title || !body.url) {
    return response.status(400).end();
  }

  if (!body.comments) {
    body.comments = [];
  }

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
    comments: body.comments,
    user: user.id,
  });

  const savedBlog = await blog.save();
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();
  response.status(201).json(savedBlog);
});

blogsRouter.delete(
  "/:id",
  middleware.userExtractor,
  async (request, response) => {
    const user = request.user;
    const blogToDelete = await Blog.findById(request.params.id);

    if (user.id.toString() === blogToDelete.user.toString()) {
      await Blog.findByIdAndDelete(request.params.id);
      response.status(204).end();
    } else {
      response
        .status(403)
        .json({ error: "only the creator can delete this blog" });
    }
  }
);

blogsRouter.put("/:id", async (request, response) => {
  const body = request.body;

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
  };

  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, {
    new: true,
  });
  response.json(updatedBlog);
});

blogsRouter.post("/:id/comments", async (request, response) => {
  const body = request.body;
  const blog = await Blog.findById(request.params.id);
  if (blog) {
    blog.comments.push(body.comment);
    await blog.save();
    response.status(201).json(body.comment);
  } else {
    response.status(404).end();
  }
});

module.exports = blogsRouter;
