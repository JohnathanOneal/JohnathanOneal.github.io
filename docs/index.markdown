---
layout: default
title: "Home"
---
<h1 class="home-title">Latest Articles</h1>
<div class="post-grid">
  {% for post in site.posts %}
    {% unless post.categories contains 'nihongo' %}
      <article class="post-card">
        <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
        <p class="post-meta">{{ post.date | date: "%B %d, %Y" }}</p>
        <div class="post-excerpt">
          {{ post.excerpt | strip_html | truncatewords: 50 }}
        </div>
        {% if post.categories %}
          <div class="post-categories">
            {% for category in post.categories %}
              {% unless category == 'nihongo' %}
                <a href="{{ site.baseurl }}/categories/{{ category | slugify }}" class="category-tag">{{ category }}</a>
              {% endunless %}
            {% endfor %}
          </div>
        {% endif %}
      </article>
    {% endunless %}
  {% endfor %}
</div>