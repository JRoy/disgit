# disgit
A Cloudflare Worker (or Docker Container) which provides better GitHub->Discord webhook integration than the built-in Discord webhook executor.

You can use this Cloudflare worker by following the steps after clicking the button below 

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/JRoy/disgit)


You can also deploy disgit to docker container:
* Docker Compose: Clone this repository and run `docker compose up --build -d`.
  * The worker will be started on port 8080
* Docker Image: The disgit container image is published to the GitHub Container Registry [here](https://github.com/JRoy/disgit/pkgs/container/disgit). For more information on how to authenticate with GitHub's container registry, check the help article [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-to-the-container-registry). 

## Environment Variables
disgit has the following optional environment variables that you can use to customize your instance;
- `IGNORED_BRANCHES_REGEX` - A regex pattern for branches that should be ignored
- `IGNORED_BRANCHES` - A comma seperated list of branches that should be ignored
- `IGNORED_USERS` - A comma seperated list of users that should be ignored
- `IGNORED_PAYLOADS` - A comma seperated list of webhook events that should be ignored
- `DEBUG_PASTE` - Set to `true` to enable debug embeds.
- `EXECUTE_MERGE_QUEUE_BRANCHES` - Set to `true` to unignore merge queue related branches.

## Supported Events
The following webhook events are supported as of now;
* [check_run](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#check_run)
* [commit_comment](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#commit_comment)
* [create](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#create)
* [delete](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#delete)
* [deployment](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#deployment)
* [deployment_status](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#deployment_status)
* [discussion](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#discussion)
* [discussion_comment](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#discussion_comment)
* [fork](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#fork)
* [gollum](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#gollum) (wiki)
* [issue_comment](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#issue_comment)
  * This event also sends pull request comments...*sigh*
* [issues](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#issues)
* [package](https://docs.github.com/en/webhooks-and-events/webhooks/webhook-events-and-payloads#package)
* [ping](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#ping)
* [pull_request](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#pull_request)
* [pull_request_review](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#pull_request_review)
* [pull_request_review_comment](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#pull_request_review_comment)
* [push](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#push)
* [release](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#release)
* [star](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#star)
* ...feel free to contribute more that suit your needs!
