import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import { Payload } from '@prisma/client/runtime/library'

const app = new Hono<{
	Bindings: {
		DATABASE_URL: string,
    JWT_SECRET : string
  }
}>();

app.get('/api/v1/home', async (c) => {
  console.log(c.env);
  return c.text('Hello Hono!')
});

app.post('/api/v1/signup', async (c) => {
  //! We don't generally connect our DB globally in serverless setup, because 1st we can't access environment variable outside the context(C), and also every route might be deployed separately.
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    // console.log(`Database url : ${c.env.DATABASE_URL}`);
    const body = await c.req.json();
    console.log(`User body data ${body}`);
    //?JWT 
    type Payload = {
      password : string,
    }
  
    const payload : Payload = {
      password : body.password,
    }
    // const secret = c.env.JWT_SECRET;
    const secret = c.env.JWT_SECRET;
    // console.log(`Secret key is: ${secret}`);
    const hashedPassword = await sign(payload, secret);
    const userCreateResp = await prisma.user.create({
      data : {
        email : body.email,
        password : hashedPassword,
        name : body.name
      }
    });
    console.log(`User created resp ${userCreateResp}`);
    return c.json({message : 'Successfully created the user', data : userCreateResp});
  } catch (error) {
    console.error("Error: ", error);
    return c.text('An error occurred in /example route', 500);
  }
});

app.post('api/v1/signin', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const user = await prisma.user.findFirst({
    where : {
      email : body.email
    }
  });

  if(!user){
    return c.json({message : "User not found", data: user});
  }

  // const password = body.password;
  // const hashedPassword = decode(password);
  // console.log(`Database hashed password: ${user.password}`);
  // console.log(`Decode password is: ${JSON.stringify(decode(user.password))}`);
  const hashedPassword = decode(user.password);
  // console.log(`Hashed password is: ${hashedPassword}`);
  const storedPassword = hashedPassword.payload.password;
  if(body.password !== storedPassword){
    return c.json({message: "Wrong password"});
  }
  return c.json({message : "Successfully logged in", data : user});
});

app.post('api/v1/blog', async (c) => {
  return c.text('Blog route')
});

app.put('/api/v1/blog', async (c) => {
  return c.text('Update route')
});

app.get('/api/v/blog:id', async (c) => {
  return c.text('Get blog routes')
});

export default app;
