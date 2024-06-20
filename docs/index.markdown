---
layout: default
title: "Home"
---

<div style="max-width: 800px; margin: 0 auto; padding: 20px;">
  <h1 style="text-align: center;">Articles</h1>

  {% for post in site.posts %}
    <a href="{{ post.url }}" style="text-decoration: none; color: inherit;">
      <div style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease;">

        <h2 style="margin-top: 0;">{{ post.title }}</h2>
        <p style="color: #666;">{{ post.excerpt }}</p>

        <div style="margin-top: 10px;">
          {% for category in post.categories %}
            <a href="{{ site.baseurl }}/categories/{{ category }}" style="display: inline-block; padding: 5px 10px; margin-right: 5px; margin-bottom: 5px; background-color: #007BFF; color: #fff; border-radius: 20px; font-size: 0.8em; text-decoration: none; transition: background-color 0.3s ease;">{{ category }}</a>
          {% endfor %}
        </div>

      </div>
    </a>
  {% endfor %}

</div>
