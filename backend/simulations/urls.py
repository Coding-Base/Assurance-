from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('simulations/run/', views.run_simulation, name='run_simulation'),
    path('workspaces/', views.list_workspaces, name='list_workspaces'),
]
