const mongoose = require("mongoose");
const helper = require("./test_helper");
const supertest = require("supertest");
const app = require("../app");
const Blog = require("../models/blog");
const User = require("../models/user");

const api = supertest(app);

beforeEach(async () => {
  await User.deleteMany({});
  await Blog.deleteMany({});
  for (let blog of helper.initialBlogs) {
    let blogObject = new Blog(blog);
    await blogObject.save();
  }
});

describe("blog information", () => {
  test("blogs are returned as json", async () => {
    await api
      .get("/api/blogs")
      .expect(200)
      .expect("Content-Type", /application\/json/);
  });

  test("get all blogs", async () => {
    const response = await api.get("/api/blogs");
    expect(response.body).toHaveLength(helper.initialBlogs.length);
  });

  test("unique identifier property of the blog posts is named id", async () => {
    const response = await api.get("/api/blogs");
    const blogs = response.body;
    blogs.forEach((blog) => {
      expect(blog.id).toBeDefined();
    });
  });
});

describe("addition of a new blog", () => {
  let headers;

  beforeEach(async () => {
    const newUser = {
      username: "username",
      name: "name",
      password: "password",
    };

    await api.post("/api/users").send(newUser);

    const result = await api.post("/api/login").send(newUser).expect(200);
    headers = { Authorization: `Bearer ${result.body.token}` };
  });

  test("succeeds with valid data", async () => {
    const newBlog = {
      title: "new title",
      author: "new author",
      url: "www.newblog.com",
      likes: 4,
    };

    await api
      .post("/api/blogs")
      .send(newBlog)
      .set(headers)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);

    const contents = blogsAtEnd.map((blog) => blog.title);
    expect(contents).toContain("new title");
  });

  test("if the likes property is missing, default to 0", async () => {
    const newBlog = {
      title: "new title",
      author: "new author",
      url: "www.newblog.com",
    };

    await api
      .post("/api/blogs")
      .send(newBlog)
      .set(headers)
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    const likes = blogsAtEnd[blogsAtEnd.length - 1].likes;
    expect(likes).toBe(0);
  });

  test("blogs without title or url will not be added", async () => {
    const newBlog = {
      author: "new author",
    };

    await api.post("/api/blogs").send(newBlog).set(headers).expect(400);

    const response = await api.get("/api/blogs");
    expect(response.body).toHaveLength(helper.initialBlogs.length);
  });
});

describe("deleting a blog", () => {
  let headers;

  beforeEach(async () => {
    await User.deleteMany({});
    await Blog.deleteMany({});

    const newUser = {
      username: "username",
      name: "name",
      password: "password",
    };

    await api.post("/api/users").send(newUser);

    const result = await api.post("/api/login").send(newUser).expect(200);
    headers = { Authorization: `Bearer ${result.body.token}` };

    const newBlog = {
      title: "new title",
      author: "new author",
      url: "www.newblog.com",
      likes: 4,
    };

    await api.post("/api/blogs").send(newBlog).set(headers).expect(201);
  });

  test("delete a blog", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToDelete = blogsAtStart[0];

    await api.delete(`/api/blogs/${blogToDelete.id}`).set(headers).expect(204);

    const blogsAtEnd = await helper.blogsInDb();

    expect(blogsAtEnd).toHaveLength(blogsAtStart.length - 1);

    const titles = blogsAtEnd.map((r) => r.title);
    expect(titles).not.toContain(blogToDelete.title);
  });
});

describe("update a blog", () => {
  let headers;

  beforeEach(async () => {
    await User.deleteMany({});
    await Blog.deleteMany({});

    const newUser = {
      username: "username",
      name: "name",
      password: "password",
    };

    await api.post("/api/users").send(newUser);

    const result = await api.post("/api/login").send(newUser).expect(200);
    headers = { Authorization: `Bearer ${result.body.token}` };

    const newBlog = {
      title: "new title",
      author: "new author",
      url: "www.newblog.com",
      likes: 4,
    };

    await api.post("/api/blogs").send(newBlog).set(headers).expect(201);
  });

  test("succeeds updating blog", async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToUpdate = blogsAtStart[0];

    const newBlog = {
      ...blogToUpdate,
      likes: blogToUpdate.likes + 1,
    };

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .send(newBlog)
      .set(headers)
      .expect(200);

    const blogsAtEnd = await helper.blogsInDb();
    const updatedBlog = blogsAtEnd.find(
      (blog) => blog.title === blogToUpdate.title
    );

    expect(updatedBlog.likes).toBe(blogToUpdate.likes + 1);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
