---
layout: default
title: "Home"
---

<div class="post-grid">
  {% for post in site.posts %}
    <article class="post-card">
      <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
      <p class="post-meta">{{ post.date | date: "%B %d, %Y" }}</p>
      <div class="post-excerpt">
        {{ post.excerpt | strip_html | truncatewords: 50 }}
      </div>
      {% if post.categories %}
        <div class="post-categories">
          {% for category in post.categories %}
            <a href="{{ site.baseurl }}/categories/{{ category | slugify }}" class="category-tag">{{ category }}</a>
          {% endfor %}
        </div>
      {% endif %}
    </article>
  {% endfor %}
</div>