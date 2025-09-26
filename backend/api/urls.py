from django.urls import path
from . import views

urlpatterns = [
    path('transcript', views.transcript, name='transcript'),
    path('summarize', views.summarize, name='summarize'),
]