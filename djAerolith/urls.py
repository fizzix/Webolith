# Aerolith 2.0: A web-based word game website
# Copyright (C) 2011 Cesar Del Solar
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

# To contact the author, please email delsolar at gmail dot com
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf.urls.defaults import *
from django.conf import settings
# Uncomment the next two lines to enable the admin:
from django.contrib import admin
from registration.forms import RegistrationFormUniqueEmail
from registration.views import register

admin.autodiscover()

import wordwalls.views

urlpatterns = patterns('',
    # Example:
    # (r'^djAerolith/', include('djAerolith.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^$', 'views.homepage'),
    (r'^old/', 'views.oldhomepage'),
    (r'^about/', 'views.about'),
    (r'^admin/', include(admin.site.urls)),
    #(r'^accounts/logout/$', 'django.contrib.auth.views.logout_then_login'),
    (r'^accounts/profile/$', 'accounts.views.profile'),
    (r'^accounts/register/$', register, {'form_class':RegistrationFormUniqueEmail, 
                                        'backend': 'registration.backends.default.DefaultBackend'}),
    (r'^accounts/', include('registration.backends.default.urls')),
    (r'^supporter/', 'views.supporter'),
    #(r'^accounts/confirm/(?P<activation_key>[0-9a-f]+)', 'accounts.views.confirm'),
    #(r'^accounts/profile/$', 'accounts.views.profile'),
    url(r'^wordwalls/$', 'wordwalls.views.homepage', name='wordwalls_create_table'),
    url(r'^wordwalls/table/(?P<id>\d+)/$', wordwalls.views.table, name='wordwalls_table'),

)

urlpatterns += staticfiles_urlpatterns()    # for static serving, only works if DEBUG is true
