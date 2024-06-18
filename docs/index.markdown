---
layout: default
title: "Home"
---

<div class="home">
  <h1>{{"Articles"}}</h1>
  <div class="posts">
    {% for post in site.posts %}
      <div class="post">
        <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
        <p>{{ post.excerpt }}</p>
        <div class="categories">
          {% for category in post.categories %}
            <a href="{{ site.baseurl }}/categories/{{ category }}" class="category-bubble {{ category }}">{{ category }}</a>
          {% endfor %}
        </div>
      </div>
    {% endfor %}
  </div>
</div>
