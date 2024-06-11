---
layout: default
title: Welcome to My Website
---

# Welcome to My Website

{% for post in site.posts %}
## [{{ post.title }}]({{ post.url }})
{{ post.excerpt }}

**Categories:**
{% for category in post.categories %}
[{{ category }}](/{{ category }}/){% unless forloop.last %}, {% endunless %}
{% endfor %}
{% endfor %}
