---
layout: category
title: Sports
permalink: /sports/
---
<h1>{{ page.title }}</h1>

<ul>
  {% for post in site.posts %}
    {% if post.categories contains page.title %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endif %}
  {% endfor %}
</ul>
