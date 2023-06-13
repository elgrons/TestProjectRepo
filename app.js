import dotenv from "dotenv";
import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import fs from "fs";
import http from "http";

//This will read your .env file and add the variables from that file to the process.env object in Node.js
dotenv.config();

//read the values of your environment variables
const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

//read the contents of your private key file
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

//create a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret,
  },
});

async function handlePushEvent({ octokit, payload }) {
  try {
      const { after, before, commits } = payload; // Destructure the necessary properties from the payload object
      console.log("After:", after);
      console.log("Before:", before);

      // Process the commits
      for (const commit of commits) {
          const commitSHA = commit.id; // Access the SHA of each commit
          console.log("Commit SHA:", commitSHA);

          // Make additional requests or process the commit as needed
          const commitDetails = await octokit.request(
              "GET /repos/{owner}/{repo}/commits/{ref}",
              {
                  owner: payload.repository.owner.login,
                  repo: payload.repository.name,
                  ref: commitSHA,
                  headers: {
                      "x-github-api-version": "2022-11-28",
                      Accept: "application/vnd.github+json",
                  },
              }
          );

          // Process the commit details
          const commitMessage = commitDetails.data.commit.message;
          const committer = commitDetails.data.commit.committer;
          console.log("Committer:", committer);
          console.log("Commit message:", commitMessage);
          console.log("Commit details:", commitDetails);
      }
  } catch (error) {
      // Error handling
      if (error.response && error.response.status) {
          console.error(
              `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`
          );
      } else {
          console.error("An error occurred:", error);
      }
  }
}


app.webhooks.on("push", handlePushEvent);
// app.webhooks.on("pull_request.opened", handlePullRequestOpened);

app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
      console.error(`Error processing request: ${error.event}`);
  } else {
      console.error(error);
  }
});

//to determine where your server will listen
const port = 3000;
const host = "localhost";
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;
//For local development, your server will listen to port 3000 on localhost. When you deploy your app, you will change these values.

//set up a middleware function to handle incoming webhook events
const middleware = createNodeMiddleware(app.webhooks, { path });

//The resulting middleware function will:

// *Check the signature of the incoming webhook event to make sure that it matches your webhook secret. This verifies that the incoming webhook event is a valid GitHub event.
// *Parse the webhook event payload and identify the type of event.
// *Trigger the corresponding webhook event handler.

//This code creates a Node.js server that listens for incoming HTTP requests (including webhook payloads from GitHub) on the specified port. When the server receives a request, it executes the middleware function that you defined earlier. Once the server is running, it logs messages to the console to indicate that it is listening.
http.createServer(middleware).listen(port, () => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`);
  console.log("Press Ctrl + C to quit.");
});
