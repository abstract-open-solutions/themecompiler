The theme package
=================

The theme package contains a the structure and utilities
that allow to develop a static theme to be used with Diazo_.

When developing a Diazo_ theme,
your static theme is typically a plain *HTML* file:
while this is very easy to get started with,
it becomes less convenient the more you proceed with development.

In fact,
you soon realize
you need to prototype slightly different layouts for the main page types
found within the system
(e.g. a homepage will be quite different from an ordinary page,
and the same is valid for the search results page, etc).

In order to do this,
you'll create as many *HTML* files as your page types are:
but since they are only *slightly* different from one another
(they might,
for example,
share the same general infrastructure,
and/ore header or footer, etc)
you'll end up copying and pasting large parts of HTML code,
ending up with a very poor maintenability.

This is why this package
(and the utilities bundled with it)
introduce the concept of *snippets*,
or parts of *HTML* that can be included within a template
to make the resuse of elements more efficient.

The @@include directive
-----------------------

If you look at the package, you'll notice this three folders:

 #. ``snippets``
 #. ``source_templates``
 #. ``templates``

.. note::
   This division is a mere convention: one can choose a different layout,
   although if the name of ``source_templates`` or ``templates`` is changed,
   one might need to pass extra options to the compiler
   (see ``COMPILE.rst``).

The first folder contains the *HTML* files that **you can include**,
while the second contains the *HTML* that **does the inclusion**.

Let's clarify with an example:
suppose you create a file named ``header.html`` into ``snippets``
that contains the following::

    <header>
       <img src="logo.png" alt="My company" />
       <nav>
         <ul>
           <li><a href="/" title="Home">Home</a></li>
           <li><a href="/section1" title="Section 1">Section 1</a></li>
           <li><a href="/section2" title="Section 2">Section 2</a></li>
         </ul>
       </nav>
    </header>

And then create a page named ``home.html`` in ``source_templates``
containing::

    <!DOCTYPE html>
    <html>
      <head>
         <title>My company</title>
      </head>
      <body>
        @@include "../snippets/header.html"
        <section>
          <article>
            <header>
              <h2>Article title</h2>
              <p>Lorem ipsum dolor sit amet</p>
            </header>
            <p>
              Pellentesque habitant morbi tristique senectus et netus et
              malesuada fames ac turpis egestas.
            </p>
          </article>
        </section>
      </body>
    </html>

As you can see,
at line 7 we have an ``@@include`` directive
followed by the file name to include.

Once the ``home.html`` file is compiled
(and we will see later how to do this)
a new file named ``home.html`` will appear in ``templates``
containing the same content of ``home.html``
with the ``@@include`` directive replaced by the contents of ``header.html``.

This way,
if we need to generate another page with the same exact header,
all we need to do is ``@@include`` it again
without having to copy and paste the code.
This approach has the added benefit that,
if we need to put an extra element in the header's navigation,
we can just modify ``header.html`` accordingly
and the files that include it
will contain the up-to-date code
without having to copy and paste it again.

The exact syntax of the ``@@include`` directive is as follows::

    @@include "<file_name_to_include.html>"

Where ``file_name_to_include.html`` is relative path
of the *HTML* file to include.

.. note::
   The system "preserves" indentation.
   This means that if you have indented the ``@@include`` directive
   by four spaces,
   four spaces will be added **to the beginning of every line**
   of the included file before being inserted.

It is also possible to use the ``@@include`` directive within snippets
(so that they will include other snippets):
the systems has guards in place
to determine when a recursion is happening
and will terminate with an error.

Compiling templates
-------------------

Thus far all looks good: but how does one compile the source templates?

This can be done in two ways, using the utility provided:
the first and most inuitive one is *on the fly compilation*.

With this method,
we start a local web server that will expose our templates to the browser
and will recompile them at each page refresh.

.. note::
   This method by default works using
   the so called *loopback network interface*,
   which is always available
   regarding whether you have an internet or network connection set up.

This is better explained by trying it out. Start the webserver as such::

    $ ../bin/theme.py serve
    Serving on localhost:8000...
    Hit Ctrl+C to quit

.. note::
   All shell commands in this tutorial suppose
   that you are currently in the theme main directory.

If you point your browser to http://localhost:8000/
you will see a plain listing
of all the files contained in ``source_templates``:
by clicking on one of the links presented the *compiled version*
(i.e with the snippets pasted in)
of the template will be displayed.

This happens because the local web server
does a compilation each time the page is requested:
if you make some changes to the template
(in ``source_templates``)
or the snippets all you need to do is to hit the refresh button
to have the template recompiled and shown again.

Static files
------------

Now, the next thing you might want to do is to reference some *CSS*,
*Javascript*,
or image file within your templates.

Actually, we already did that in ``header.html``
when we referenced ``logo.png``.

The question is, however, where should I put such files?

The theme package provides a directory, ``static``, exactly for that.
It is structured as follows::

    static
    |-- img
    |-- scripts
    `-- styles

And each of the three subdirectories should contain:

img
    All the images referenced by the templates or CSS
scripts
    *Javascript* files
styles
    *CSS* or LESS_ files

.. note::
   You can create further subdirectories within the ones provided,
   for example you can house third party javascripts like jQuery_
   in ``static/scripts/common/jquery-1.7.2.js``,
   or web fonts in ``img/fonts/``.

For now let's assume we have put our file ``logo.png``
in ``static/img/logo.png``.
We would then change ``header.html`` to contain::

    <header>
       <img src="../../static/img/logo.png" alt="My company" />
       <nav>
         <ul>
           <li><a href="/" title="Home">Home</a></li>
           <li><a href="/section1" title="Section 1">Section 1</a></li>
           <li><a href="/section2" title="Section 2">Section 2</a></li>
         </ul>
       </nav>
    </header>

As you can see, we just have to put there the
**relative** path of the file (relative to the template).

Within *CSS* or LESS_ files,we would instead reference images (or web fonts)
with the path **relative to the CSS file location**
(generally something like ``../img/path/to/image.png``).

Shared files
------------

Sometimes, certain static files (e.g. jQuery_)
or even some snippets (e.g. the footer, or common ``<head>`` stuff)
are shared by more than just one theme.

In this case,
the system makes it possible to reference or include a file
that sits *outside* the theme package,
as long as it resides in a **sister directory** of the our theme.

For example, suppose that we have::

    <root>
    |
    |- bin
    |  |
    |  |- theme.py
    |
    |- mytheme
    |  |
    |  |- snippets
    |  |
    |  |- source_templates
    |  |
    |  |- templates
    |  |
    |  |- static
    |
    |- shared
    |  |
    |  |- snippets
    |  |
    |  |- source_templates
    |  |
    |  |- templates
    |  |
    |  |- static

It is possible then to include both the file
``shared/snippets/head.html`` by doing::

    @@include "../../shared/snippets/head.html"

Which is the relative path of the file in respect to our template
(``mytheme/source_templates/home.html``).

We can also include the file ``shared/static/scripts/common/jquery.js``
by doing::

    <script type="text/javascript"
            src="../../++theme++shared/static/scripts/common/jquery.js">
    </script>

The main difference here
is that we have to prefix the sister directory containing the shared parts
of our theme
with ``++theme++``.

Using LESS
==========

Above, we mentioned the fact that you can use LESS_ instead of plain *CSS*.

LESS_ is a widely used *CSS preprocessor*
and will greatly improve designer productivity
and maintanbility of your styles.

As the site puts it:

    LESS extends CSS with dynamic behavior
    such as variables, mixins, operations and functions.

It's not in the scope of this document to provide an overview of LESS_
or to teach its use: for all those needs, refer to `their website`_.

However, there are a few recommendations on its usage
that we will see in more detail.

Use the client-side less.js in development
------------------------------------------

This theme includes already a version of LESS_ at ``less/less.js``.

.. note::
   This is actually a patched version to enable debugging information
   needed by *FireLESS*.
   However, the developers of LESS_ have been contacted
   in order to merge the patches in further releases.

In order to use it, you should add the following
in the ``<head>`` of your templates::

    <script type="text/javascript"
            src="../../++theme++shared/less/less.js/dist/less-1.3.0.js">
    </script>

And then include your LESS_ files as follows::

    <link rel="stylesheet/less" type="text/css"
          href="../static/styles/mytheme.less" />

.. note::
   Make sure to always terminate the ``link`` tag with ``/>``
   or the utilities might have problems doing `Offline compilation`_

Using the client side version allows faster development,
better error reporting (they appear directly in the browser)
and is required if you plan on `Using FireLESS`_.

Using FireLESS
--------------

One irritating thing about *CSS preprocessors* is that,
since they allow nesting and *opaque imports*,
it can become quite hard to determine, from the generated CSS,
where a certain definition happens.

FireLESS_ is an extension for Firebug_ that will display,
in the *styles sidebar* of the inspector mode of Firebug_,
the LESS_ file and line number where a certain definition occurs.

.. note::
   Currently, it requires the `patched version of LESS`_ to work.
   The patched version is the one already present
   at ``less/less.js``.
   The modification is `being included in LESS`_ and, once done,
   will also be supported by the *Chrome Web Inspector*.

The extension can be installed as any other Firefox add-on.

Once installed, if LESS_ is in development mode
(which means that you are using it *client side*
and you are accessing files at a local domain such as ``localhost``)
it will print some debug info on top of every generated rule
and FireLESS_ will pick it up to show the correct file name and line.

.. note::
   The debug info syntax `was copied from SASS`_
   and FireLESS_ derives from another addon tailored for *SASS*.

Include multiple files using @import
------------------------------------

It is important, when developing with LESS_,
to avoid loading multiple LESS_ files:
instead, you should take advantage of LESS_ ``@import`` directive.

For example, if we have four LESS_ files:

variables.less
    Contains all the variable used in other files
header.less
    Contains styles for the header only
calendar.less
    Contains styles for a calendar widget
main.less
    Contains the main styling, such as fonts and basic elements

It is better to merge them into a single ``mytheme.less`` file
as follows::

    //mytheme.less
    @import "variables"
    @import "header"
    @import "calendar"
    @import "main"

Rather than having four ``link`` tags in the head.
This is because:

  #. This results in a single *CSS* file beign generated,
     which means better performance for the site (less *HTTP* requests)
  #. The ability to use mixins or variables defined in other files
  #. Better control of the importing sequence

.. warning::
   It is not possible to ``@import`` shared files
   or the offline compilation will not work.

Offline compilation
===================

Once you go into production, you don't want to recompile the templates
*on the fly* or use LESS_ in client mode
(which would create a too higher load on the browser:
this is known to cause problems on some older devices).

Therefore, you can compile the templates offline by running::

    $ ../bin/theme.py compile

Which will compile all your templates and put them in ``templates``.

If you are using LESS_, you should install `node.js`_ and then run::

    $ ../bin/theme.py compile --compile-less --nodejs-bin=/path/to/nodejs

This will compile the templates
and also all the LESS_ files referenced by such templates:
the outputted *CSS* files are saved alongside the LESS_ source,
so that ``static/styles/foo.less`` becomes ``static/styles/foo.css``.

This will also rewrite the ``link`` tags in the compiled template
so that it will point to a *CSS* file instead of a LESS_ one.

Detailed option documentation
=============================

Run::

    $ ../bin/theme.py --help

for a list of available commands, and::

    $ ../bin/theme.py command_name --help

for a detailed list of options for every command.

You can also read up the full documentation for the compiler on ``COMPILE.rst``.

.. _Diazo: http://diazo.org
.. _LESS: http://lesscss.org
.. _jQuery: http://jquery.org
.. _`their website`: LESS_
.. _FireLESS: https://addons.mozilla.org/en-US/firefox/addon/fireless/
.. _Firebug: http://getfirebug.com
.. _`patched version of LESS`: https://github.com/simonedeponti/less.js
.. _`being included in LESS`: https://github.com/cloudhead/less.js/pull/880
.. _`was copied from SASS`:
   http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#debug_info-option
.. _`node.js`: http://nodejs.org
