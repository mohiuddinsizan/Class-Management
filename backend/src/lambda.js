// src/lambda.js
import serverless from "serverless-http";
import app, { ensureDBConnection } from "./app.js";

// Lambda handler
const handler = serverless(app);

export const lambdaHandler = async (event, context) => {
  // Ensure DB connection before handling request
  await ensureDBConnection();
  
  // Execute the request
  return handler(event, context);
};
