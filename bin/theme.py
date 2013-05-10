#!/usr/bin/python
#FORCE COMMIT
import os, re, logging, mimetypes, sys, urllib2, subprocess
import time
from base64 import b64encode
from collections import MutableMapping, namedtuple
from argparse import ArgumentParser
from ConfigParser import SafeConfigParser
from tempfile import mkstemp
from traceback import print_exc, format_exc
from SocketServer import ThreadingMixIn
from wsgiref.simple_server import make_server, WSGIServer
from wsgiref.util import FileWrapper
try:
    from collections import OrderedDict
except ImportError:
    from ordereddict import OrderedDict
try:
    from html5tidy import tidy
    CAN_TIDY = True
except ImportError:
    CAN_TIDY = False
    print 'INFO: html5tidy not found. Skipping HTML tidy-fication.'
    print 'INFO: use `pip install html5tidy` to install it.'


THEME_PREFIX = '++theme++'
NO_VALUE = object()

mimetypes.add_type('text/x-component', '.htc')
mimetypes.add_type('image/x-icon', '.ico')
mimetypes.add_type('text/css', '.less')


# shameless copy from
# http://stackoverflow.com/questions/377017/test-if-executable-exists-in-python
def is_exe(fpath):
    return os.path.exists(fpath) and os.access(fpath, os.X_OK)


def which(*names):
    for name in names:
        for path in os.environ["PATH"].split(os.pathsep):
            exe_file = os.path.join(path, name)
            if is_exe(exe_file):
                return exe_file
    return None


def walk(base_folder):
    for root, __, files in os.walk(base_folder):
        for file in files:
            if file.endswith('.html'):
                fullpath = os.path.join(root, file)
                yield os.path.relpath(fullpath, base_folder)


def url2path(url):
    return os.sep.join(url.split("/"))


def path2url(path):
    return "/".join(path.split(os.sep))


def urljoin(*args):
    return "/".join(args)


def normpath(path):
    return os.path.normpath(path.replace(THEME_PREFIX, ''))


def join(*args):
    return normpath(os.path.join(*args))


class option(object):

    action = 'store'

    def __init__(self, name, default, short_name=None, help_text=None):
        self.key = name
        self.short_name = short_name
        self.default = default
        self.help_text = help_text
        self.extra_kwargs = {}

    @property
    def names(self):
        base_name = self.key.replace('_', '-')
        names = []
        if self.short_name:
            names.append('-' + self.short_name)
        names.append('--' + base_name)
        return names

    def prep(self, value):
        return value

    def add_to_parser(self, parser):
        kwargs = {
            'dest': self.key,
            'action': self.action,
            'default': self.default
        }
        if self.help_text:
            kwargs['help'] = self.help_text
        kwargs.update(self.extra_kwargs)
        parser.add_argument(*self.names, **kwargs)


class bool_option(option):

    def prep(self, value):
        if isinstance(value, basestring):
            return value.lower() in ["true", "on", "1"]
        return bool(value)

    @property
    def names(self):
        base_name = self.key.replace('_', '-')
        if self.default:
            base_name = 'no-' + base_name
        names = []
        if self.short_name:
            names.append('-' + self.short_name)
        names.append('--' + base_name)
        return names

    @property
    def action(self):
        if self.default:
            return 'store_false'
        else:
            return 'store_true'


class int_option(option):

    def prep(self, value):
        if isinstance(value, int):
            return value
        return int(value, 10)


class list_option(option):
    # pylint: disable=W0104

    def __init__(self, name, default, short_name=None, help_text=None):
        super(list_option, self).__init__(name, default, short_name,
                                          help_text)
        self.extra_kwargs['nargs'] = '*'

    def prep(self, value):
        if isinstance(value, (list, tuple)):
            return value
        return value.split(',')


class options(MutableMapping):

    def __init__(self, *data):
        data = [ d for d in data ]
        self.data = data
        flat_options = []
        for item in self.data:
            flat_options.append((item.key, item))
        self.options_dict = OrderedDict(flat_options)
        self.values = {}

    def __contains__(self, item):
        return (item in self.options_dict or item in self.values)

    def __iter__(self):
        return iter(set(self.options_dict.keys()) | set(self.values.keys()))

    def __len__(self):
        return len(set(self.options_dict.keys()) | set(self.values.keys()))

    def __getitem__(self, key):
        default = NO_VALUE
        if key in self.options_dict:
            default = self.options_dict[key].default
        if default is NO_VALUE:
            return self.values[key]
        else:
            return self.values.get(key, default)

    def __setitem__(self, key, value):
        try:
            value = self.options_dict[key].prep(value)
        except KeyError:
            value = value
        self.values[key] = value

    def __delitem__(self, key):
        del self.values[key]

    def copy(self):
        new = self.__class__(*self.data)
        new.values = self.values
        return new

    def add_to_parser(self, parser):
        for item in self.data:
            item.add_to_parser(parser)


class LESSFile(object):
    """A LESS file found in a template.

    Contains additional info such as the base path,
    needed for referentiation.
    """

    def __init__(self, path, referenced_by, output_path, compiler):
        self.path = path
        self.referenced_by = referenced_by
        self.css_path = output_path
        self.compiler = compiler

    def __str__(self):
        return os.path.basename(self.input_path)

    def __repr__(self):
        return repr(self.input_path)

    def __unicode__(self):
        return os.path.basename(self.input_path).decode('utf-8')

    def __hash__(self):
        return hash(self.input_path)

    def __eq__(self, other):
        return self.input_path == other.input_path

    def __ne__(self, other):
        return not self.__eq__(other)

    @property
    def input_path(self):
        return join(os.path.dirname(self.referenced_by), self.path)

    @property
    def output_path(self):
        return join(os.path.dirname(self.referenced_by), self.css_path)


class ThreadingWSGIServer(ThreadingMixIn, WSGIServer):
    """A threading WSGI server, processing each request in a new thread.

    Yes, it's *that* simple.
    """


class Configurable(object):

    default_config = options()

    def __init__(self, global_config, **local_config):
        self.config = self.default_config.copy()
        self.config.update(global_config)
        self.config.update(local_config)

    @classmethod
    def setup_parser(cls, parser):
        cls.default_config.add_to_parser(parser)



DumpItem = namedtuple(
    'DumpItem',
    [
        'filename',
        'extension',
        'url',
        'data',
        'headers'
    ]
)


def basic_auth(user, password):
    return b64encode("%s:%s" % (user, password))


class DumpList(object):

    def __init__(self, parser):
        self.forward = {}
        self.reverse = {}
        self.defaults = parser.defaults()
        if parser.has_section('urls'):
            for target, url in parser.items('urls'):
                if target not in self.defaults:
                    self.forward[target] = url
                    self.reverse[url] = target

    def __iter__(self):
        for filename, url in self.forward.items():
            name, extension = os.path.splitext(filename)
            yield DumpItem(name, extension, url, None, {})
            if 'user' in self.defaults and 'password' in self.defaults:
                yield DumpItem(
                    "%s.authenticated" % name,
                    extension,
                    url,
                    None,
                    {
                        'Authorization': 'Basic %s' % basic_auth(
                            self.defaults['user'],
                            self.defaults['password']
                        )
                    }
                )


class Dumper(Configurable):
    """Accesses a list of web pages and dumps them into files.

    You must provide a "dump list",
    which is an INI-formatted file with a section named [urls] and,
    within that section, a list of options where the key is the file name
    where the page will be saved and the value is the url to retrieve.
    """

    default_config = options(
        option('base_dir', '.',
               help_text=("The theme package folder")),
        option('dump_folder', 'dumped_templates',
               help_text="The folder in which the templates will de dumped"),
        option('dump_list', 'dump.lst',
               help_text="The file containing the list of templates to dump")
    )

    def __init__(self, global_config, **local_config):
        super(Dumper, self).__init__(global_config, **local_config)
        self.base_directory = join(os.getcwd(), self.config['base_dir'])

    @property
    def folder(self):
        return join(self.base_directory, self.config['dump_folder'])

    def templates(self):
        """Return the list of dumped templates
        """
        return walk(self.folder)

    def get_list(self):
        """Reads the URLs to dump from the config file.

        The config file is as follows:

            [DEFAULT]
            user = foo
            password = secret

            [urls]
            source.html = http://example.com/index.html

        Where each line in the urls section contains the target file
        as the first element and the url to retrieve as the second.

        If the ``[DEFAULT]`` is provided, the ``user``and ``password``
        parameter will be used to do basic authentication.
        """
        parser = SafeConfigParser()
        parser.read([ join(self.base_directory, self.config['dump_list']) ])
        return DumpList(parser)

    def dump(self, item):
        fullpath = item.filename + item.extension
        dirname, basename = os.path.split(fullpath)
        target_dir = os.path.join(self.folder, dirname)
        if not os.path.isdir(target_dir):
            os.makedirs(target_dir)
        target_file = os.path.join(target_dir, basename)
        request = urllib2.Request(
            item.url,
            item.data,
            item.headers
        )
        with open(target_file, 'wb') as target_stream:
            input_stream = urllib2.urlopen(request)
            if CAN_TIDY:
                data = tidy(input_stream, pretty_print=True, encoding="utf-8")
            else:
                data = input_stream.read()
            target_stream.write(data)

    def dump_all(self):
        list = self.get_list()
        for item in list:
            self.dump(item)

    @classmethod
    def main(cls, args):
        dumper = cls(vars(args))
        try:
            dumper.dump_all()
        except: # pylint: disable=W0702
            print_exc()
            return -1
        return 0


class HTMLCompiler(Configurable):
    """Compiles HTML templates by processing include directives.
    """
    # pylint: disable=W0102

    include_regex = re.compile(r'^(\s*)@@include "(.+)"')
    link_regex = re.compile(r'<link(?:(?<!/>).)+/>', re.M | re.I | re.S)
    # attr_regex = r'="([A-Za-z0-9\.\\_/\-\+]+)"'
    attr_regex = r'="(?<!http:|/)([A-Za-z0-9\.\\_/\-\+]+)"'
    href_regex = re.compile(r'href="([A-Za-z0-9\.\\_/\-\+]+\.less)"')
    rel_regex = re.compile(r'rel="([A-Za-z0-9/-]+)"')
    import_regex = re.compile(r'@import\s+"([^"]+)"')

    default_config = options(
        option('base_dir', '.',
               help_text=("The theme package folder")),
        option('source_folder', 'source_templates',
               help_text=("The folder containing the source templates "
                          "(relative to the base directory)")),
        option('compiled_folder', 'templates',
               help_text=("The folder where the compiled source templates "
                          "are saved (relative to the base directory)")),
        bool_option('block',
                    False,
                    help_text=("When compiling all templates, "
                               "block on the first failing. "
                               "If unset (the default) the compile all "
                               "will report any error but won't block")),
        bool_option('verbose', False, help_text="Turn on verbose reporting"),
        bool_option('compile_less', False,
                    help_text=("If enabled, the system will compile "
                               "LESS files referenced in templates")),
        option('lessc_bin', 'lessc',
               help_text="The path of the LESS compiler file"),
        list_option('url_attrs', ['href', 'src'],
                    help_text=("List of attributes containing urls "
                               "(that need rewriting)")),
        option('optimize_css', '',
               help_text=("Optimizes the CSS using the given method: "
                          "'simple' for simple whitespace removal, "
                          "'yui' for Yahoo UI CSSMin "
                          "(requires installing the proper NPM)")),
    )

    def __init__(self, global_config, **local_config):
        super(HTMLCompiler, self).__init__(global_config, **local_config)
        self.base_directory = join(os.getcwd(), self.config['base_dir'])
        self.source_folder = join(self.base_directory,
                                  self.config['source_folder'])
        self.templates_folder = join(self.base_directory,
                                     self.config['compiled_folder'])
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.addHandler(logging.StreamHandler())
        if self.config['verbose']:
            self.logger.setLevel(logging.DEBUG)
        else:
            self.logger.setLevel(logging.WARNING)
        self.do_compile_less = self.config['compile_less']
        self.lessc_bin = self.config['lessc_bin']
        if self.lessc_bin is not None and not is_exe(self.lessc_bin):
            self.lessc_bin = which(self.lessc_bin)
        if self.lessc_bin is None or not os.path.exists(self.lessc_bin):
            if self.do_compile_less:
                self.logger.warning(
                    " ** Could not find lessc at '%s'" % self.lessc_bin
                )
            self.lessc_bin = None
        if self.do_compile_less and self.lessc_bin is None:
            self.logger.warning(
                " ** Disabling LESS compilation: try setting "
                "--lessc-bin options"
            )
            self.do_compile_less = False
        self.url_regexes = []
        self.optimize = self.config['optimize_css']
        for attr in self.config['url_attrs']:
            self.url_regexes.append(
                re.compile(re.escape(attr)+self.attr_regex)
            )

    @property
    def folder(self):
        return self.config['compiled_folder']

    def parse(self, path, passed_paths=None, base_path=None,
              failed_paths=None):
        # pylint: disable=W0102
        if failed_paths is None:
            failed_paths = {}
        if base_path is None:
            base_path = os.path.dirname(path)
        if passed_paths is None:
            passed_paths = {}
        with open(path, 'rb') as stream:
            for line in stream:
                m = self.include_regex.search(line)
                if m is not None:
                    initial_whitespace, raw_snippet_path = m.groups()
                    snippet_path = join(os.path.dirname(path),
                                        url2path(raw_snippet_path))
                    current_passed_paths = passed_paths.copy()
                    if snippet_path in current_passed_paths:
                        raise RuntimeError(
                            ("recursion error: "
                             "'%s' has been already included by '%s', "
                             "and '%s' wants to include it again") % (
                                snippet_path,
                                passed_paths[snippet_path],
                                path
                            )
                        )
                    current_passed_paths[snippet_path] = path
                    for snippet_line in self.parse(snippet_path,
                                                   current_passed_paths,
                                                   base_path,
                                                   failed_paths):
                        yield initial_whitespace + snippet_line
                else:
                    for url_regex in self.url_regexes:
                        m = url_regex.search(line)
                        if m is not None:
                            fullpath = join(
                                os.path.dirname(path),
                                url2path(m.group(1))
                            )
                            if not os.path.isfile(fullpath):
                                failed_paths.setdefault(
                                    fullpath, set()).add(path)
                            relpath = path2url(
                                self.relpath(
                                    fullpath,
                                    base_path
                                )
                            )
                            m_start, m_end = m.span(1)
                            line = line[:m_start]+relpath+line[m_end:]
                    yield line

    def relpath(self, path, base):
        theme_base = os.path.dirname(self.base_directory.rstrip(os.sep))
        relative_path = os.path.relpath(path, base)
        components = relative_path.split(os.sep)
        current = base
        for i, component in enumerate(components):
            if current == theme_base:
                components[i] = THEME_PREFIX + component
            current = os.path.normpath(
                os.path.abspath(os.path.join(current, component))
            )
        return os.path.join(*components)

    def fullpath(self, path):
        return join(self.base_directory, url2path(path.rstrip('/')))

    def is_output(self, path):
        if path.startswith(self.templates_folder):
            return True
        return False

    def templates(self):
        """Return the list of source_templates
        """
        return walk(self.source_folder)

    def less2css(self, output_path, less_files=set()):
        content = ''
        with open(output_path, 'rb') as output_stream:
            content = output_stream.read()
        def replace(match):
            link = match.group(0)
            href_m = self.href_regex.search(link)
            rel_m = self.rel_regex.search(link)
            if rel_m is not None and href_m is not None and \
                    rel_m.group(1) == "stylesheet/less":
                href = href_m.group(1)
                base, __ = os.path.splitext(href)
                less_files.add(
                    LESSFile(href, output_path, base + ".css", self)
                )
                transformed_link = "%s%s%s%s" % (
                    link[:href_m.start(1)],
                    base,
                    ".css?%d" % int(time.time()),
                    link[href_m.end(1):]
                )
                return transformed_link.replace("stylesheet/less",
                                                "stylesheet")
            return link
        with open(output_path, 'wb') as output_stream:
            output_stream.write(self.link_regex.sub(replace, content))

    def compiled_path(self, source):
        """Transforms the source template path in the compiled path
        """
        rel_path = os.path.relpath(source, self.source_folder)
        return join(self.templates_folder, rel_path)

    def source_path(self, compiled):
        """Transforms the compiled path in the source path
        """
        rel_path = os.path.relpath(compiled, self.templates_folder)
        return join(self.source_folder, rel_path)

    def make_intermediates(self, path):
        target_dir = os.path.dirname(path)
        if not os.path.isdir(target_dir):
            os.makedirs(target_dir)

    def compile(self, path, less_files=set(), failed_paths=None):
        """Try to compile the html file, parsing the @@include tags
        """
        if failed_paths is None:
            failed_paths = {}
        base_dir = os.getcwd()
        self.logger.info(" ** Compiling %s" % os.path.relpath(path, base_dir))
        output_path = self.compiled_path(path)
        self.make_intermediates(output_path)
        with open(output_path, 'wb') as output:
            for line in self.parse(path, failed_paths=failed_paths):
                output.write(line)
        if self.do_compile_less:
            self.less2css(output_path, less_files=less_files)
        return output_path

    def preprocess_less_import(self, matchobj, import_dir, less_files):
        fullpath = join(
            import_dir,
            url2path(matchobj.group(1))
        )
        if fullpath.endswith(".less"):
            fullpath = self.preprocess_less(fullpath, less_files)
            if os.path.dirname(fullpath) == import_dir:
                path = os.path.basename(fullpath)
            else:
                path = os.path.relpath(fullpath, import_dir)
        else:
            path = fullpath
        return '@import "'+path+'"'

    def preprocess_less(self, less_file, preprocessed_less_files):
        dir = os.path.dirname(less_file)
        name, extension = os.path.splitext(os.path.basename(less_file))
        handle, preprocessed_less_file = mkstemp(
            prefix=name+"-",
            suffix="-preprocessed"+extension,
            dir=dir
        )
        os.close(handle)
        with open(less_file, 'rb') as raw_input:
            with open(preprocessed_less_file, 'wb') as input:
                for line in raw_input:
                    input.write(
                        self.import_regex.sub(
                            lambda m: self.preprocess_less_import(
                                m,
                                dir,
                                preprocessed_less_files
                            ),
                            line
                        )
                    )
        preprocessed_less_files.add(preprocessed_less_file)
        return preprocessed_less_file

    def compile_less(self, less_files):
        base_dir = os.getcwd()
        self.logger.info(' * Compiling all LESS files')
        for file in less_files:
            self.logger.info(
                ' ** Compiling LESS file: %s' % os.path.relpath(
                    file.input_path,
                    base_dir
                )
            )
            preprocessed_less = set()
            input_path = self.preprocess_less(
                file.input_path,
                preprocessed_less
            )
            args = (self.lessc_bin, input_path)
            if self.optimize == 'simple':
                args = (args[0], '--compress', args[1])
            elif self.optimize == 'yui':
                args = (args[0], '--yui-compress', args[1])
            try:
                with open(file.output_path, 'wb') as output_stream:
                    subprocess.check_call(
                        args,
                        stdin=None,
                        stdout=output_stream
                    )
            except subprocess.CalledProcessError, e:
                if os.path.exists(file.output_path):
                    os.remove(file.output_path)
                self.logger.error(
                    " *** Compiling '%s' failed" % os.path.relpath(
                        file.input_path,
                        base_dir
                    )
                )
                self.logger.debug(
                    " **** Compilation of '%s' reported: %s" % (
                        os.path.relpath(
                            file.input_path,
                            base_dir
                        ),
                        e
                    )
                )
            finally:
                for path in preprocessed_less:
                    os.remove(path)

    def compile_all(self):
        """Compile all html files in the source_folder
        """

        self.logger.info(' * Compiling all HTML source templates')

        less_files = set()
        base_dir = os.getcwd()
        failed_paths = {}
        for src in self.templates():
            try:
                self.compile(
                    join(self.source_folder, src),
                    less_files=less_files,
                    failed_paths=failed_paths
                )
            except: # pylint: disable=W0702
                if self.config['block']:
                    raise
                self.logger.exception(
                    " ** Error compiling '%s'" % os.path.relpath(
                        src,
                        base_dir
                    )
                )
        if len(failed_paths) > 0:
            self.logger.warning(
                "Failed paths:\n  * " + "\n  * ".join(
                    "%s:\n      - %s" % (
                        os.path.relpath(k, self.base_directory),
                        "\n      - ".join(
                            os.path.relpath(p, self.base_directory) for p in v
                        )
                    ) \
                        for k, v in failed_paths.items()
                )
            )
        if self.do_compile_less:
            self.compile_less(less_files)

    @classmethod
    def main(cls, args):
        compiler = cls(vars(args))
        try:
            compiler.compile_all()
        except: # pylint: disable=W0702
            print_exc()
            return -1
        return 0


class Application(Configurable):
    """Serve templates compiling them on-the-fly.
    """

    default_config = options(
        option('host', '',
               help_text="The host or IP on which to listen for connections"),
        int_option('port', 8000,
                   help_text="The TCP port on which to listen"),
        bool_option('serve_only', False,
                    help_text=("If enabled, serves the files directly from "
                               "the compiled templates directory "
                               "without attempting to recompile"))
    )

    style = """
body { font-size: 12pt; font-family: sans-serif; color: hsl(200, 20%, 20%); }
#wrapper { width: 60em; margin: 0 auto; }
h1 { text-align: center; line-height: 2em; color: hsl(200, 20%, 10%); }
h2, h3, h4, h5, h6 { border-radius: 3pt; padding-left: 0.5em;
 line-height: 1.7em; }
h2 { background-color: hsl(200, 5%, 80%); color: hsl(200, 20%, 17%); }
h3 { background-color: hsl(200, 5%, 88%); color: hsl(200, 20%, 18%); }
h4 { background-color: hsl(200, 5%, 92%); color: hsl(200, 20%, 19%); }
h5 { background-color: hsl(200, 5%, 94%); color: hsl(200, 20%, 20%); }
h6 { background-color: hsl(200, 5%, 95%); color: hsl(200, 20%, 21%); }
.discreet { color: hsl(200, 20%, 30%); font-style: italic; }
ul { list-style-type: none; }
li p { margin: 0.1em 0em; }
a { line-height: 1.5em; padding-left: 0.2em; padding-right: 0.2em;
 color: hsl(0, 70%, 55%); text-decoration: none; }
a:visited { color: hsl(0, 70%, 55%); }
a:hover { color: hsl(0, 70%, 95%); background-color: hsl(0, 70%, 55%);
 border-radius: 3pt; }
code, pre { border-radius: 3pt; padding: 0.2em;
 background-color: hsl(200, 20%, 90%); }
pre { width: 58em; margin-left: 1em; overflow-x: scroll; }
body.notfound h1 { color: hsl(40, 90%, 50%); }
body.error h1 { color: hsl(0, 90%, 50%); }
@media screen and (max-width: 60em) { #wrapper { width: inherit;
 margin: 0 1em; } }
"""

    response_404 = u"""<!DOCTYPE html>
    <html>
      <head>
        <title>404 - {path} not found</title>
        <meta name="viewport"
              content="initial-scale=1.0, user-scalable=yes, width=device-width, minimum-scale=1.0" />
        <style type="text/css">{style}</style>
      </head>
      <body class="notfound">
        <div id="wrapper">
          <h1>I'm sorry, Dave</h1>
          <p>But I'm afraid <code>{path}</code> does not exist.</p>
        </div>
      </body>
    </html>
    """

    response_500 = u"""<!DOCTYPE html>
    <html>
      <head>
        <title>500 - An error has occurred</title>
        <meta name="viewport"
              content="initial-scale=1.0, user-scalable=yes, width=device-width, minimum-scale=1.0" />
        <style type="text/css">{style}</style>
      </head>
      <body class="error">
        <div id="wrapper">
          <h1>Owch</h1>
          <p>Something went wrong. <strong>Really wrong</strong>.</p>
          <p>We have detected this error:
          <pre>{exc}</pre>
          <p>You might want to also copy and paste the data below
             and send it to your system administrator:</p>
          <pre>{traceback}</pre>
        </div>
      </body>
    </html>
    """

    root_template = u"""<!DOCTYPE html>
    <html>
      <head>
        <title>Themes</title>
        <meta name="viewport"
              content="initial-scale=1.0, user-scalable=yes, width=device-width, minimum-scale=1.0" />
        <style type="text/css">{style}</style>
      </head>
      <body class="listing">
        <div id="wrapper">
          <h1>Themes</h1>
          {themes}
        </div>
      </body>
    </html>
    """

    listing_template = u"""<!DOCTYPE html>
    <html>
      <head>
        <title>Templates</title>
        <meta name="viewport"
              content="initial-scale=1.0, user-scalable=yes, width=device-width, minimum-scale=1.0" />
        <style type="text/css">{style}</style>
      </head>
      <body class="listing">
        <div id="wrapper">
          <h1>Templates</h1>
          <h2>Designed</h2>
          {source_list}
          <h2>Dumped</h2>
          {dump_list}
        </div>
      </body>
    </html>
    """

    template_list_template = u'<ul>{items}</ul>'
    template_list_template_with_title = (
        u'<li>'
        u'<p>{idx}. <strong>{title}</strong></p>'
        u'<ul>{items}</ul>'
        u'</li>'
    )
    template_list_noitems = u'<p class="discreet">No templates</p>'
    template_item_template = u'<li>{idx}. <a href="./{0}{1}">{2}</a></li>'
    commands = {
        'serve': None,
        'compile': 'Compiler',
        'dump': 'Dumper'
    }
    Dumper = Dumper
    Compiler = HTMLCompiler

    def __init__(self, global_config, **local_config):
        super(Application, self).__init__(global_config, **local_config)
        self.config['port'] = self.config['port']
        self.serve_only = self.config['serve_only']
        self.base_dir = os.getcwd()

    def info(self, path):
        __, extension = os.path.splitext(path)
        try:
            mimetype = mimetypes.types_map[extension]
        except KeyError:
            mimetype = 'application/octet-stream'
        with open(path, 'rb') as stream:
            stream.seek(0, os.SEEK_END)
            length = stream.tell()
        return (length, mimetype)

    def get(self, compiler, path, start_response):
        try:
            fullpath = compiler.fullpath(path)
            if self.serve_only or not compiler.is_output(fullpath):
                serve_path = fullpath
            else:
                serve_path = compiler.source_path(fullpath)
            if not os.path.exists(serve_path):
                status = "404 Not Found"
                content = [
                    self.response_404.format(
                        path=path,
                        style=self.style
                    ).encode('utf-8')
                ]
                length = len(content[0])
                ctype = 'text/html; charset=UTF-8'
            else:
                length, ctype = self.info(serve_path)
                if self.serve_only or ctype.lower() != "text/html":
                    content = FileWrapper(open(serve_path, 'rb'))
                else:
                    less_files = set()
                    fullpath = compiler.compile(serve_path,
                                                     less_files=less_files)
                    compiler.compile_less(less_files)
                    ctype = '%s; charset=UTF-8' % (ctype,)
                    length, __ = self.info(fullpath)
                    content = FileWrapper(open(fullpath, 'rb'))
                status = "200 OK"
        except Exception, e: # pylint: disable=W0703
            if isinstance(e, KeyboardInterrupt):
                raise e
            status = "500 Internal Server Error"
            content = [
                self.response_500.format(
                    exc=e,
                    traceback=format_exc(),
                    style=self.style
                ).encode('utf-8')
            ]
            length = len(content[0])
            ctype = 'text/html; charset=UTF-8'
        headers = [
            ('Content-Type', ctype),
            ('Content-Length', str(length))
        ]
        start_response(status, headers)
        return content

    def recursive_template_format(self, base_folder, templates, base_url,
                                  title=None, idx=''):
        items = []
        keys = templates.keys()
        keys.sort()
        for index, key in enumerate(keys):
            if isinstance(templates[key], dict):
                items.append(
                    self.recursive_template_format(
                        base_folder,
                        templates[key],
                        "/".join([base_url, key]),
                        title=key,
                        idx=idx+str(index+1)+'.'
                    )
                )
            else:
                items.append(
                    self.template_item_template.format(
                        base_folder,
                        "/".join([base_url, key]),
                        templates[key].replace('_', ' '),
                        idx=idx+str(index+1)
                    )
                )
        items = "\n".join(items)
        if title is None:
            return self.template_list_template.format(items=items)
        else:
            return self.template_list_template_with_title.format(
                title=title.replace('_', ' '),
                items=items,
                idx=idx[:-1] if len(idx) > 0 else idx
            )

    def template_list(self, compiler_or_dumper):
        templates = {}
        for path in compiler_or_dumper.templates():
            url = path2url(path)
            url_components = url.split("/")
            root = templates
            for component in url_components[:-1]:
                root = root.setdefault(component, {})
            root[url_components[-1]] = os.path.splitext(url_components[-1])[0]
        if len(templates) == 0:
            return self.template_list_noitems
        else:
            return self.recursive_template_format(
                compiler_or_dumper.folder,
                templates,
                '',
            )

    def listing(self, compiler, dumper, start_response):
        content = self.listing_template.format(
            compiler=compiler,
            dumper=dumper,
            source_list=self.template_list(compiler),
            dump_list=self.template_list(dumper),
            style=self.style
        ).encode('utf-8')
        headers = [
            ('Content-Type', 'text/html; charset=UTF-8'),
            ('Content-Length', str(len(content)))
        ]
        start_response("200 OK", headers)
        return [ content ]

    def root(self, start_response):
        themes = []
        for path in os.listdir(self.base_dir):
            fullpath = os.path.join(self.base_dir, path)
            if os.path.isdir(fullpath):
                config = self.config.copy()
                config['base_dir'] = fullpath
                compiler = self.Compiler(config)
                if os.path.isdir(compiler.source_folder):
                    themes.append(
                        ('./%s%s/' % (THEME_PREFIX, path),
                         path.replace('_', ' ').capitalize())
                    )
        content = self.root_template.format(
            themes=u'<ul>\n%s\n</ul>\n' % '\n'.join(
                u'<li><a href="%s">%s</a></li>' % theme for theme in themes
            ),
            style=self.style
        ).encode('utf-8')
        headers = [
            ('Content-Type', 'text/html; charset=UTF-8'),
            ('Content-Length', str(len(content)))
        ]
        start_response("200 OK", headers)
        return [ content ]

    def __call__(self, environ, start_response):
        components = environ['PATH_INFO'].rstrip('/').split('/')[1:]
        if len(components) == 0:
            return self.root(start_response)
        else:
            config = self.config.copy()
            config['base_dir'] = join(self.base_dir, components[0])
            compiler = self.Compiler(config)
            dumper = self.Dumper(config)
            if len(components) > 1:
                return self.get(compiler, urljoin(*components[1:]),
                                start_response)
            return self.listing(compiler, dumper, start_response)

    @classmethod
    def main(cls, args):
        app = cls(vars(args))
        httpd = make_server(
            app.config['host'],
            app.config['port'],
            app,
            server_class=ThreadingWSGIServer
        )
        try:
            print "Serving on %s:%d..." % (app.config['host'],
                                           app.config['port'])
            print "Hit Ctrl+C to quit"
            httpd.serve_forever()
        except KeyboardInterrupt:
            print "Quitting..."
        return 0

    @classmethod
    def setup_parser(cls, parser):
        super(Application, cls).setup_parser(parser)
        # Serve uses the full option list
        cls.Compiler.setup_parser(parser)

    @classmethod
    def run(cls):
        parser = ArgumentParser(
            description=("The theme development utility. "
                         "Includes three modes: "
                         "one for serving a theme compiled on-the-fly, "
                         "the other for compiling statically a theme "
                         "and the latter to dump URLs to files")
        )
        subparsers = parser.add_subparsers(
            title="Commands",
            description="Available commands (modes of operation)"
        )
        for key, target in cls.commands.items():
            if target is None:
                target = cls
            else:
                target = getattr(cls, target)
            subparser = subparsers.add_parser(
                key,
                description=target.__doc__,
                help=target.__doc__.splitlines()[0]
            )
            target.setup_parser(subparser)
            subparser.set_defaults(target=target)
        args = parser.parse_args()
        if hasattr(args, 'target'):
            sys.exit(args.target.main(args))
        else:
            parser.print_usage()
            sys.exit(-1)


if __name__ == "__main__":
    Application.run()
