# disgit
A cloudflare worker script which provides better github->discord webhooks than the built in discord webhook executor.

## Supported Events
The following webhook events are supported as of now;
* [check_run](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#check_run)
  * Everything other than check success is marked as a failure 
* [commit_comment](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#commit_comment)
* [create](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#create)
* [delete](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#delete)
* [deployment](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#deployment)
* [deployment_status](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#deployment_status)
* [discussion](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#discussion)
  * Event is invite-only (at time of writing) and needs to be manually selected in webhook settings
* [discussion_comment](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#discussion_comment)
  * Event is invite-only (at time of writing) and needs to be manually selected in webhook settings
* [fork](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#fork)
* [gollum](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#gollum) (wiki)
* [issue_comment](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#issue_comment)
  * This event also send pull request comments...*sigh*
* [issues](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#issues)
* [ping](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#ping)
* [pull_request](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#pull_request)
* [pull_request_review](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#pull_request_review)
* [pull_request_review_comment](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#pull_request_review_comment)
* [push](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#push)
* [release](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#release)
* [star](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#star)
* ...feel free to contribute more that suit your needs!

## Installation
1. Go to your cloudflare worker dashboard by clicking [here](https://dash.cloudflare.com/?to=/:account/workers) 
   and create a new worker.
1. Copy all the code from [disgit.js](https://github.com/JRoy/disgit/blob/master/disgit.js) and paste it into 
   the script window of your worker.
1. Click `Save and Deploy` and confirm your deployment.
1. Create a new webhook in your GitHub repository/organization settings.
1. Paste your worker's url into the `Payload URL` field and append `(webhook id)/(webhook token)` to the end.
   * For example if you had the worker url `https://my-worker.test.workers.dev` and the discord webhook url 
     `https://discord.com/api/webhooks/840438712203557422/8H3D57RQzftJmhw9VfEaLFLABjItuDScjU-c_nYKffb1hTlktLapwd`,
     the payload url you should have in the GitHub webhook form is 
     `https://my-worker.test.workers.dev./840438712203557422/8H3D57RQzftJmhw9VfEaLFLABjItuDScjU-c_nYKffb1hTlktLapwd`.
1. Set the `Content type` to `application/json`
1. You can configure the events to whichever you would like to receive. *Remember that some events require you to
   explicitly pick them in "`Let me select individual events`" and will not send with the "`Send my everything`"
   option.*
1. Click `Add webhook`.
1. That's it, you're all setup, and your webhooks should start coming in.
