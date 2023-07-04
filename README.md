# disgit
A Cloudflare Worker which provides better GitHub->Discord webhook integration than the built-in Discord webhook executor.

You can use this Cloudflare worker by following the steps after clicking the button below 

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/JRoy/disgit)


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
