---
layout: default
title: "Sports"
---

<h2>Posts in category: Sports</h2>

<ul>
  {% for post in site.categories.sports %}
    <li><a href="{{ post.url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
