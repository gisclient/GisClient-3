<?php

require_once __DIR__ . '/../../bootstrap.php';
require_once ROOT_PATH . 'lib/i18n.php';
require_once ADMIN_PATH . 'lib/functions.php';

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestMatcher;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Controller\ControllerResolver;
use Symfony\Component\Routing\Router;
use Symfony\Component\Routing\RequestContext;
use Symfony\Component\Config\FileLocator;
use Symfony\Component\Routing\Loader\YamlFileLoader;
use Symfony\Component\Yaml\Yaml;
use GisClient\Author\Security\AuthenticationHandler;

function getFirewall(Request $request)
{
    $security = Yaml::parse(
        file_get_contents(ROOT_PATH . 'config/security.yml')
    );
    $firewalls = $security['security']['firewalls'];
    foreach ($firewalls as $firewallName => $firewall) {
        if (isset($firewall['pattern'])) {
            $firewallMatcher = new RequestMatcher($firewall['pattern']);
            if ($firewallMatcher->matches($request)) {
                return $firewall;
            }
        } else {
            throw new \Exception('No pattern defined for this firewall '.$firewallName);
        }
    }

    return null;
}

function checkAccessControl(Request $request, AuthenticationHandler $authHandler)
{
    $allowAccess = false;
    $security = Yaml::parse(
        file_get_contents(ROOT_PATH . 'config/security.yml')
    );
    $accessControls = $security['security']['access_control'];
    foreach ($accessControls as $accessControl) {
        $accessControlMatcher = new RequestMatcher($accessControl['path']);
        if ($accessControlMatcher->matches($request)) {
            if (!$accessControl['authenticated']) {
                return true;
            } elseif ($authHandler->isAuthenticated()) {
                return true;
            } else {
                return false;
            }
        }
    }

    return false;
}

$gcService = \GCService::instance();
$gcService->startSession();

$locator = new FileLocator(array(
    ROOT_PATH . 'config'
));

// create request & context
$request = Request::createFromGlobals();
$requestContext = new RequestContext();
$requestContext->fromRequest($request);

try {
    $router = new Router(
        new YamlFileLoader($locator),
        'routing.yml',
        array(),
        $requestContext
    );
    
    $requestMatch = $router->match($request->getPathInfo());
    
    
    $firewall = getFirewall($request);
    if (null !== $firewall && isset($firewall['provider'])) {
        $provider = new $firewall['provider'](\GCApp::getDB());
    } else {
        $provider = null;
    }
    
    if (null !== $firewall && isset($firewall['guard'])) {
        $guard = new $firewall['guard']();
    } else {
        $guard = null;
    }
    
    if ($provider !== null || $guard !== null) {
        $authHandler = GCApp::getAuthenticationHandler($provider, $guard);
        $authHandler->login($request);
        if (!checkAccessControl($request, $authHandler)) {
            throw new AccessDeniedHttpException('Authentication required to access this path.');
        }
    }
    
    $request->attributes->add($requestMatch);

    $resolver = new ControllerResolver();
    $controller = $resolver->getController($request);
    $arguments = $resolver->getArguments($request, $controller);
    
    $response = call_user_func_array($controller, $arguments);
} catch (Routing\Exception\ResourceNotFoundException $e) {
    $response = new Response('Not Found', 404);
} catch (HttpException $e) {
    if (strpos($request->headers->get('accept'), 'application/json') !== false) {
        $response = new JsonResponse([
            'status' => 'error',
            'message' => $e->getMessage()
        ], $e->getStatusCode(), $e->getHeaders());
    } else {
        $response = new Response($e->getMessage(), $e->getStatusCode(), $e->getHeaders());
    }
} catch (Exception $e) {
    $response = new Response('An error occurred: ' . $e->getMessage(), 500);
}

$response->send();