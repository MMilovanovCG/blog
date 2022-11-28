---
title: Prometheus and its Federation through Thanos at CarGurus - Part 1
date: "2022-11-23T16:04:56Z"
author: "jnathani"
tags:
- site reliability engineering
- observability
- prometheus
- thanos
---

## Introduction

Prometheus is a monitoring and alerting toolkit. It is a standalone open-source project governed by CNCF (Cloud Native Computing Foundation). Prometheus collects and stores metrics as time series data, i.e. metrics information is stored with the timestamp at which it was recorded, alongside optional key-value pairs called labels.  The metrics collected can be anything that the cluster or an application is exposing. They could be Application-level metrics such as HTTP Status Codes, Number of HTTP Requests, API Requests, Types of API Requests, or Caching Metrics or they could be Infrastructure-level metrics such as Memory Utilization, CPU Utilization, CPU Throttling, or Disk Utilization.

## Architecture at CarGurus
For a long time, Prometheus was deployed on bare metal on-prem servers. But since the push for the Move to AWS started, we moved our Prometheus servers to Kubernetes clusters in AWS.

At CarGurus, our infrastructure is divided between two regions primarily. NA (North America) and EU (Europe). All the internal applications, like Vault, Opentelemetry, Kyverno, Cert-manager, ArgoCD, Prometheus, Thanos, etc., and a good chunk of production services are currently deployed in Kubernetes clusters. Every cluster has its own set of identical Prometheus pods that scrape the deployments in that cluster. These identical Prometheus pods scrape the same targets and endpoint and are deduplicated during queries. Prometheus, Grafana, and Alertmanager are automatically deployed using the Prometheus Operator (kube-prometheus-stack) which is also responsible for updating the configuration of the three systems.  As with all things in Helm, these charts allow us to easily configure the systems via simple changes to the YAML files in the chart. Happy Helming!!

(P.S. Helm is a Kubernetes deployment tool for automating the creation, packaging, configuration, and deployment of applications and services to Kubernetes clusters.)

### Service Discovery
Service discovery is a mechanism by which services discover each other dynamically without the need for hard coding IP addresses or endpoint configuration. In the past, we used to perform service discovery by manually editing Prometheus configuration in order to add scraping endpoints. This meant that developers would need to file a ticket and someone from the Engineering Platform team would modify a source-controlled configuration file by hand to add a job. We utilized Consul for service discovery, meaning that in order to be scraped, an application also had to register itself with Consul. Luckily we do not need to do this malarkey anymore with Kubernetes.

In Kubernetes, service discovery can be accomplished by using a ServiceMonitor CRD (Custom Resource Definition) which is a part of the kube-prometheus-stack. The ServiceMonitor CRD is a Kubernetes object that specifies the endpoint and port that Prometheus should scrape. Any service deployed in Kubernetes would need a corresponding ServiceMonitor object that defines the metrics endpoint and a port. An example of a ServiceMonitor object for service-x in namespace-x could be as follows:


```
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
annotations:
meta.helm.sh/release-name: service-x
meta.helm.sh/release-namespace: namespace-x
labels:
app: service-x
app.kubernetes.io/managed-by: Helm
chart: service-x-1.0.0
name: service-x
namespace: namespace-x
spec:
endpoints:
- interval: 15s
  path: /metrics
  port: express
  selector:
  matchLabels:
  app: service-x
  chart: service-x-1.0.0
```

The Port specified under the endpoints label can be a number or a named port, in the Service object that fronts the application/deployment. For the ServiceMonitor to work, a Service object also has to be created.


Prometheus is configured to look for any ServiceMonitor objects specified in any namespace of the given cluster. So, if one is present and configured correctly, then the application will automatically be scraped on deployment to the cluster. Some Helm charts would automatically create the ServiceMonitor object for you. Check its configuration before using it as an upstream chart.

It’s worth noting that there are other service discovery mechanisms as well that can be used, like EC2 Service Discovery. EC2 Service Discovery configurations allow retrieving scrape targets from AWS EC2 instances. Prometheus has a built-in EC2 Service Discover config that can be added as a part of its spec that can pick up services deployed in stand-alone EC2 instances.

### Rules
Prometheus Rules, also referred to as alert definitions, are YAML files that contain a Prometheus Query expression that would determine if an alert should fire. Whenever an alert is fired, it goes through the built-in Alertmanager, which, depending on the severity of the alert, can trigger an integrated incident response software like OpsGenie or PagerDuty.

At CarGurus, we divide the Prometheus Rules files based on the priority of the service. For example, if a service is P1 (Priority 1), then it would have its own single rules file. All the internal services would have a common rules file. And so on.

### Exporters
There are a number of libraries and servers which help in exporting existing metrics from third-party systems as Prometheus metrics. Prometheus supports integrations with a bunch of exporters ranging across Databases, Hardware, Storage, HTTP, APIs, and a lot more. You can get more information on Prometheus exporters from its official documentation. Following is one of the examples of a third-party exporter we deploy at CarGurus.

#### Node Exporter at CG
The Prometheus Node Exporter exposes a wide variety of hardware and kernel-related metrics like CPU, Memory, and other system statistics. At CarGurus the node exporter runs on the nodes themselves and is scraped by the Prometheus instance that spans the nodes rather than the Prometheus instance deployed within the cluster. This means that the information from the node exporter is in a different Prometheus instance (Infrastructure team focused) than would normally be expected.

<div style="max-width: 600px;"><img src="Architecture diagram.png" alt="Prometheus Architecture Diagram" /></div>

## Prometheus Federation
At CarGurus, we have a number of Dev, Prod NA, and Prod EU Kubernetes clusters that have individual Prometheus instances deployed within them. It can get a bit hard to follow and difficult when metrics across multiple clusters are needed in a query or a global metric is needed. A global or some level of federation across Prometheus instances helps to find a solution to such use cases. At CarGurus, we have deployed Thanos as a Prometheus Federation tool. We will discuss in more depth about Thanos in Part 2 of this post.

