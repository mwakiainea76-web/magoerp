<?php

namespace App\Exceptions\Security;

use Exception;

class SecurityException extends Exception
{
    public function __construct(
        string $message = 'Security violation.',
        int $code = 403,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, $code, $previous);
    }
}
