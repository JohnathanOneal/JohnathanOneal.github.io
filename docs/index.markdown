---
layout: default
title: "Home"
---
<h1 class="home-title">Latest Articles</h1>
<div class="newspaper-category">
    <div class="newspaper-columns">
        {% for post in site.posts %}
            <article class="newspaper-article">
                <h2 class="article-title">
                    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
                </h2>
                <p class="post-meta">
                    {{ post.date | date: "%B %d, %Y" }}
                </p>
                <div class="article-excerpt">
                    {{ post.excerpt | strip_html | truncatewords: 50 }}
                </div>
                {% if post.categories %}
                    <div class="post-categories">
                        <strong>Categories:</strong>
                        {% for category in post.categories %}
                                <a href="{{ site.baseurl }}/categories/{{ category | slugify }}" class="category-tag">{{ category }}</a>
                                {% unless forloop.last %}, {% endunless %}
                        {% endfor %}
                    </div>
                {% endif %}
                <a href="{{ post.url | relative_url }}" class="read-more">
                    {% if post.categories contains 'nihongo' %}
                        続きを読む...
                    {% else %}
                        Read more...
                    {% endif %}
                </a>
            </article>
        {% endfor %}
    </div>
</div>
